export const getFileType = (name: string) =>
    /\.(png|jpe?g|gif|bmp|webp|svg|tiff?)$/i.test(name) ? "image" :
        /\.pdf$/i.test(name) ? "pdf" : "other";


export const GetIconPath = (name: string) => {
    const type = getFileType(name || "");
    return {
        image: "/img/others/photo.svg",
        pdf: "/img/others/pdf.svg",
        other: "/img/others/file.svg"
    }[type];
}