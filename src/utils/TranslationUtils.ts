export function formatTemplate(
  template: string,
  params: Record<string, string | number>,
): string {
  //search any words using {}
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}
