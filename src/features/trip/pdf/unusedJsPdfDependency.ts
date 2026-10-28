/**
 * Substitui as dependências opcionais do jsPDF (html2canvas, dompurify, canvg).
 * Elas só servem para converter HTML/SVG em PDF, o que o TravelDesk não usa;
 * assim não entram no pacote. Veja `resolve.alias` em vite.config.ts.
 */
export default {};
