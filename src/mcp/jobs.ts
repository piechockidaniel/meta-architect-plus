import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { baseEnvironment, resolveEnv, type TaskConfig } from './config.js';
import { AuditLog, redact } from './security.js';

export function executable(command: string, args: string[]): { command: string; args: string[] } {
  if (command === 'node') return { command: process.execPath, args };
  if (command === 'npm') {
    const cli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (!existsSync(cli)) throw new Error('npm CLI was not found alongside Node. Configure a node task with an absolute npm-cli.js path.');
    return { command: process.execPath, args: [cli, ...args] };
  }
  if (/\.(?:cmd|bat|ps1)$/i.test(command)) throw new Error('Configure an executable and fixed arguments; shell scripts are not launched implicitly.');
  return { command, args };
}

type State = 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed-out';
type Job = {
  id: string; appId: string; taskId: string; group: string; state: State; startedAt: string;
  endedAt?: string; exitCode?: number | null; output: string; truncated: boolean;
  process: ChildProcess; timer: NodeJS.Timeout; stopReason?: 'cancelled' | 'timed-out';
  finished: Promise<void>;
};

export class Jobs {
  private jobs = new Map<string, Job>();
  private reservations = new Set<string>();
  private closing = false;
  constructor(private audit: AuditLog) {}
  async start(appId: string, root: string, taskId: string, task: TaskConfig) {
    if (this.closing) throw new Error('MCP job manager is shutting down.');
    if ([...this.jobs.values()].filter(j => j.state === 'running').length + this.reservations.size >= 4) throw new Error('Four tasks are already running.');
    const reservation = `${appId}/${task.exclusiveGroup}`;
    if (this.reservations.has(reservation) || [...this.jobs.values()].some(j => j.state === 'running' && j.appId === appId && j.group === task.exclusiveGroup)) throw new Error('A task in this project group is already running.');
    const invocation = executable(task.command, task.args);
    const env = { ...baseEnvironment(), ...resolveEnv(task.env) };
    this.reservations.add(reservation);
    let child: ChildProcess;
    try {
      await this.audit.write({ action: 'task', appId, target: taskId, outcome: 'starting' });
      if (this.closing) throw new Error('MCP job manager is shutting down.');
      child = spawn(invocation.command, invocation.args, { cwd: root, env, shell: false, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    } finally { this.reservations.delete(reservation); }
    let finish!: () => void;
    const job: Job = {
      id: randomUUID(), appId, taskId, group: task.exclusiveGroup, state: 'running', startedAt: new Date().toISOString(),
      output: '', truncated: false, process: child, timer: setTimeout(() => { void this.stop(job, 'timed-out').catch(() => { job.output += '\nCould not record timeout audit.'; }); }, task.timeoutMs),
      finished: new Promise<void>(resolve => { finish = resolve; }),
    };
    this.jobs.set(job.id, job);
    const append = (chunk: Buffer) => {
      // Retain a bounded tail. Redact the whole retained buffer to catch secrets split across chunks.
      job.output += chunk.toString('utf8');
      if (job.output.length > 65_536) { job.output = job.output.slice(-65_536); job.truncated = true; }
    };
    child.stdout?.on('data', append);
    child.stderr?.on('data', append);
    let settled = false;
    const settle = (exitCode: number | null, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(job.timer);
      if (error) append(Buffer.from(error.message));
      job.state = job.stopReason ?? (exitCode === 0 ? 'succeeded' : 'failed');
      job.exitCode = exitCode;
      job.endedAt = new Date().toISOString();
      job.output = redact(job.output);
      void this.audit.write({ action: 'task', appId, target: taskId, jobId: job.id, outcome: job.state }).catch(() => {
        job.output += '\nAudit completion could not be recorded.';
      }).finally(finish);
    };
    child.once('error', error => settle(null, error));
    child.once('close', code => settle(code));
    // Keep at most 100 completed/running jobs in this host session.
    for (const [id, previous] of this.jobs) {
      if (this.jobs.size <= 100) break;
      if (previous.state !== 'running') this.jobs.delete(id);
    }
    return this.view(job.id);
  }
  private async stop(job: Job, reason: 'cancelled' | 'timed-out') {
    if (job.state !== 'running' || job.stopReason) return;
    job.stopReason = reason;
    // Failure to append a final audit event must not leave an owned child running forever.
    const logged = this.audit.write({ action: 'task-stop', appId: job.appId, target: job.taskId, jobId: job.id, outcome: reason });
    if (process.platform === 'win32' && job.process.pid) {
      // Fixed executable/arguments; kill the owned process tree, never unrelated listeners.
      const killer = spawn(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'), ['/pid', String(job.process.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false });
      killer.on('error', () => job.process.kill());
    } else if (job.process.pid) {
      try { process.kill(-job.process.pid, 'SIGKILL'); } catch { job.process.kill('SIGKILL'); }
    }
    await logged;
  }
  view(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Unknown job in this MCP session.');
    return { id: job.id, appId: job.appId, taskId: job.taskId, state: job.state, startedAt: job.startedAt, endedAt: job.endedAt, exitCode: job.exitCode, output: redact(job.output), truncated: job.truncated };
  }
  list(appId?: string) { return [...this.jobs.values()].filter(j => !appId || j.appId === appId).map(j => this.view(j.id)); }
  async cancel(id: string) {
    const job = this.jobs.get(id);
    if (!job) throw new Error('Unknown job in this MCP session.');
    await this.stop(job, 'cancelled');
    return this.view(id);
  }
  async close() {
    this.closing = true;
    await Promise.all([...this.jobs.values()].filter(j => j.state === 'running').map(async job => {
      await this.stop(job, 'cancelled');
      await job.finished;
    }));
  }
}
