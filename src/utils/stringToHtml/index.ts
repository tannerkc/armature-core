export const stringToHTML = (htmlString: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    return doc.body.firstChild;
}
