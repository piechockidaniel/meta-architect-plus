/** Keep typographic dashes readable with the spatial kit's limited glyph atlas.
 * Project data and exported records keep the original Unicode text.
 */
export function spatialText(text: string): string {
  return text.replace(/[\u2013\u2014]/g, '-');
}
