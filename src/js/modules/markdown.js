export function configureMarkdown() {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}
