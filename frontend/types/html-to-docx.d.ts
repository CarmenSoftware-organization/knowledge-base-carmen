declare module "html-to-docx" {
  interface DocxOptions {
    title?: string;
    font?: string;
    fontSize?: number;
    lineHeight?: number;
    pageNumber?: boolean;
    margin?: { top?: number; bottom?: number; left?: number; right?: number };
    table?: { row?: { cantSplit?: boolean } };
  }
  function HTMLtoDOCX(
    html: string,
    headerHtml: string | null,
    options?: DocxOptions
  ): Promise<Blob>;
  export default HTMLtoDOCX;
}
