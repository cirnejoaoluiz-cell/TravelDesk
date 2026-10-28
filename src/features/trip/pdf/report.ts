import { jsPDF } from 'jspdf';
import { autoTable, type CellHookData, type UserOptions } from 'jspdf-autotable';
import interRegular from '../../../assets/fonts/Inter-Regular.ttf?inline';
import interSemiBold from '../../../assets/fonts/Inter-SemiBold.ttf?inline';
import type { Trip } from '../../../domain/types';
import { daysBetween, formatDateRange } from '../../../lib/dates';

/**
 * Motor dos relatórios em PDF (A4, gerados no navegador com jsPDF + jspdf-autotable).
 * A fonte Inter é embutida no arquivo: acentos e símbolos saem corretos sem
 * depender de fontes do sistema nem de serviços externos.
 */

// Identidade visual do TravelDesk (mesmos valores dos tokens claros do app).
const COLORS = {
  ink: '#1a1c1b',
  ink2: '#565b58',
  ink3: '#8b8f8c',
  accent: '#1f4d43',
  border: '#e6e2da',
  surface2: '#f4f2ee',
  danger: '#b3422f',
} as const;

type Tone = 'ink' | 'muted' | 'faint' | 'accent' | 'danger';
const TONE_COLOR: Record<Tone, string> = {
  ink: COLORS.ink,
  muted: COLORS.ink2,
  faint: COLORS.ink3,
  accent: COLORS.accent,
  danger: COLORS.danger,
};

const PAGE = { width: 210, height: 297 };
const MARGIN = { left: 18, right: 18, top: 18, bottom: 20 };
/** Topo do conteúdo nas páginas seguintes (abaixo do cabeçalho resumido). */
const CONTINUATION_TOP = 28;
export const CONTENT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;
const FONT = 'Inter';
const BODY_SIZE = 9;

/** Um parágrafo dentro de uma célula: quebra de linha automática, com peso e cor próprios. */
export interface RichPart {
  text: string;
  bold?: boolean;
  tone?: Tone;
}

/** Conteúdo de célula com vários parágrafos (ex.: título em negrito + detalhes em cinza). */
export interface RichCell {
  rich: RichPart[];
  align?: 'left' | 'right';
}

export type TableCell = string | RichCell;

export interface TableColumn {
  header: string;
  /** Largura em mm; a soma deve ser igual a CONTENT_WIDTH. */
  width: number;
  align?: 'left' | 'right';
}

interface StyledLine {
  text: string;
  bold: boolean;
  tone: Tone;
}

const isRich = (raw: unknown): raw is RichCell =>
  typeof raw === 'object' && raw !== null && Array.isArray((raw as RichCell).rich);

/** Remove partes vazias para não gerar linhas em branco. */
export function parts(...items: (RichPart | false | null | undefined | '')[]): RichPart[] {
  return items.filter((p): p is RichPart => Boolean(p && p.text && p.text.trim()));
}

export class Report {
  readonly doc: jsPDF;
  private y = MARGIN.top;
  private readonly generatedAt = new Date();

  constructor(
    private readonly trip: Trip,
    private readonly section: string,
  ) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    this.doc.addFileToVFS('Inter-Regular.ttf', base64(interRegular));
    this.doc.addFont('Inter-Regular.ttf', FONT, 'normal');
    this.doc.addFileToVFS('Inter-SemiBold.ttf', base64(interSemiBold));
    this.doc.addFont('Inter-SemiBold.ttf', FONT, 'bold');
    this.doc.setFont(FONT, 'normal');
    this.doc.setProperties({ title: `${trip.name || 'Viagem'} — ${section}`, creator: 'TravelDesk' });
    this.drawTitleBlock();
  }

  // ------------------------------------------------------------- primitivas

  private setText(size: number, bold = false, tone: Tone = 'ink') {
    this.doc.setFont(FONT, bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(TONE_COLOR[tone]);
  }

  private lineHeight(size: number) {
    return (size * this.doc.getLineHeightFactor()) / this.doc.internal.scaleFactor;
  }

  private bottomLimit() {
    return PAGE.height - MARGIN.bottom;
  }

  private newPage() {
    this.doc.addPage();
    this.y = CONTINUATION_TOP;
  }

  /** Garante espaço vertical; senão, começa uma nova página. */
  private ensure(height: number) {
    if (this.y + height > this.bottomLimit()) this.newPage();
  }

  /** Texto com quebra automática; continua na página seguinte se necessário. */
  private paragraph(text: string, size: number, bold: boolean, tone: Tone, gapAfter = 0) {
    this.setText(size, bold, tone);
    const lh = this.lineHeight(size);
    for (const line of this.doc.splitTextToSize(text, CONTENT_WIDTH) as string[]) {
      this.ensure(lh);
      this.setText(size, bold, tone);
      this.doc.text(line, MARGIN.left, this.y, { baseline: 'top' });
      this.y += lh;
    }
    this.y += gapAfter;
  }

  // -------------------------------------------------------------- cabeçalho

  private drawTitleBlock() {
    const { trip } = this;
    this.setText(7.5, true, 'accent');
    this.doc.text(`TRAVELDESK  ·  ${this.section.toUpperCase()}`, MARGIN.left, this.y, { baseline: 'top', charSpace: 0.4 });
    this.y += 7;

    this.paragraph(trip.name || 'Viagem sem nome', 20, true, 'ink', 2);

    const nights = daysBetween(trip.startDate, trip.endDate);
    const period = formatDateRange(trip.startDate, trip.endDate) + (nights !== null && nights > 0 ? ` (${nights + 1} dias)` : '');
    const destinations = trip.destinations.length ? trip.destinations.join(' · ') : 'Destino a definir';
    this.paragraph(`${destinations}   |   ${period}`, 10, false, 'muted', 1.5);

    const generated = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(this.generatedAt);
    this.paragraph(`Gerado em ${generated}`, 8, false, 'faint', 5);

    this.doc.setDrawColor(COLORS.border);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN.left, this.y, PAGE.width - MARGIN.right, this.y);
    this.y += 7;
  }

  // ------------------------------------------------------------ conteúdo

  /** Título de grupo (ex.: dia do roteiro). Fica sempre junto do conteúdo seguinte. */
  heading(text: string, subtitle?: string) {
    const needed = this.lineHeight(12) + (subtitle ? this.lineHeight(9) : 0) + 22;
    this.ensure(needed);
    this.paragraph(text, 12, true, 'ink', subtitle ? 0.5 : 2.5);
    if (subtitle) this.paragraph(subtitle, 9, false, 'muted', 2.5);
  }

  /** Rótulo de seção em caixa alta (ex.: "Resumo", "Despesas"). */
  label(text: string) {
    this.ensure(this.lineHeight(8) + 20);
    this.setText(8, true, 'accent');
    this.doc.text(text.toUpperCase(), MARGIN.left, this.y, { baseline: 'top', charSpace: 0.35 });
    this.y += this.lineHeight(8) + 2.5;
  }

  note(text: string, tone: Tone = 'muted') {
    this.paragraph(text, BODY_SIZE, false, tone, 4);
  }

  /** Caixa discreta para seções sem registros. */
  empty(text: string) {
    const height = 16;
    this.ensure(height);
    this.doc.setFillColor(COLORS.surface2);
    this.doc.roundedRect(MARGIN.left, this.y, CONTENT_WIDTH, height, 2, 2, 'F');
    this.setText(9.5, false, 'muted');
    this.doc.text(text, PAGE.width / 2, this.y + height / 2, { align: 'center', baseline: 'middle' });
    this.y += height + 6;
  }

  space(mm: number) {
    this.y += mm;
  }

  /**
   * Tabela com cabeçalho repetido a cada página. Linhas não são cortadas entre
   * páginas (a menos que uma única linha seja maior que uma página inteira).
   */
  table(columns: TableColumn[], rows: TableCell[][], options: { head?: boolean } = {}) {
    const styled = new Map<RichCell, StyledLine[]>();
    const consumed = new Map<RichCell, number>();
    const toDraw = new WeakMap<object, StyledLine[]>();
    const lh = this.lineHeight(BODY_SIZE);
    const showHead = options.head ?? true;

    const body = rows.map((row) =>
      row.map((cell, i) => {
        const align = isRich(cell) ? (cell.align ?? columns[i].align) : columns[i].align;
        return { content: isRich(cell) ? '' : cell || '—', styles: { halign: align ?? 'left' }, rich: isRich(cell) ? cell : undefined };
      }),
    );

    const settings: UserOptions = {
      startY: this.y,
      margin: { top: CONTINUATION_TOP, bottom: MARGIN.bottom, left: MARGIN.left, right: MARGIN.right },
      head: showHead ? [columns.map((c) => ({ content: c.header, styles: { halign: c.align ?? 'left' } }))] : undefined,
      body: body as never,
      theme: 'plain',
      rowPageBreak: 'avoid',
      showHead: 'everyPage',
      tableWidth: CONTENT_WIDTH,
      columnStyles: Object.fromEntries(columns.map((c, i) => [i, { cellWidth: c.width }])),
      styles: {
        font: FONT,
        fontStyle: 'normal',
        fontSize: BODY_SIZE,
        textColor: COLORS.ink,
        cellPadding: { top: 2.6, bottom: 2.6, left: 2.4, right: 2.4 },
        lineColor: COLORS.border,
        valign: 'top',
        overflow: 'linebreak',
      },
      headStyles: {
        fontStyle: 'bold',
        fontSize: 7.5,
        textColor: COLORS.ink3,
        fillColor: COLORS.surface2,
        cellPadding: { top: 2.2, bottom: 2.2, left: 2.4, right: 2.4 },
      },
      bodyStyles: { lineWidth: { bottom: 0.2 } },
      didParseCell: (data: CellHookData) => {
        const rich = (data.cell.raw as { rich?: RichCell })?.rich;
        if (!rich || data.section !== 'body') return;
        // Quebra cada parágrafo com a fonte certa (negrito é mais largo) e guarda o estilo de cada linha.
        const width = columns[data.column.index].width - data.cell.padding('horizontal');
        const lines: StyledLine[] = [];
        for (const part of rich.rich) {
          this.doc.setFont(FONT, part.bold ? 'bold' : 'normal');
          this.doc.setFontSize(BODY_SIZE);
          for (const text of this.doc.splitTextToSize(part.text, width) as string[]) {
            lines.push({ text, bold: Boolean(part.bold), tone: part.tone ?? 'ink' });
          }
        }
        if (!lines.length) lines.push({ text: '—', bold: false, tone: 'faint' });
        styled.set(rich, lines);
        consumed.set(rich, 0);
        data.cell.text = lines.map((l) => l.text);
      },
      willDrawCell: (data: CellHookData) => {
        const rich = (data.cell.raw as { rich?: RichCell })?.rich;
        const lines = rich && styled.get(rich);
        if (!rich || !lines || data.section !== 'body') return;
        // Uma linha longa pode ser dividida entre páginas: desenha só o trecho desta parte.
        const start = consumed.get(rich) ?? 0;
        toDraw.set(data.cell, lines.slice(start, start + data.cell.text.length));
        consumed.set(rich, start + data.cell.text.length);
        data.cell.text = [];
      },
      didDrawCell: (data: CellHookData) => {
        const lines = toDraw.get(data.cell);
        if (!lines) return;
        const right = data.cell.styles.halign === 'right';
        const x = right ? data.cell.x + data.cell.width - data.cell.padding('right') : data.cell.x + data.cell.padding('left');
        let y = data.cell.y + data.cell.padding('top');
        for (const line of lines) {
          this.setText(BODY_SIZE, line.bold, line.tone);
          this.doc.text(line.text, x, y, { baseline: 'top', align: right ? 'right' : 'left' });
          y += lh;
        }
      },
    };

    autoTable(this.doc, settings);
    const finalY = (this.doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
    this.y = (finalY ?? this.y) + 7;
  }

  // ------------------------------------------------------------- finalizar

  /** Cabeçalho resumido nas páginas seguintes, rodapé e numeração. */
  private decoratePages() {
    const total = this.doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      this.doc.setPage(page);
      if (page > 1) {
        this.setText(8, true, 'ink');
        this.doc.text(this.trip.name || 'Viagem', MARGIN.left, 12, { baseline: 'middle', maxWidth: 120 });
        this.setText(8, false, 'faint');
        this.doc.text(this.section, PAGE.width - MARGIN.right, 12, { baseline: 'middle', align: 'right' });
        this.doc.setDrawColor(COLORS.border);
        this.doc.setLineWidth(0.3);
        this.doc.line(MARGIN.left, 17, PAGE.width - MARGIN.right, 17);
      }
      const footerY = PAGE.height - 10;
      this.setText(7.5, true, 'faint');
      this.doc.text('TravelDesk', MARGIN.left, footerY, { baseline: 'middle' });
      if (total > 1) {
        this.setText(7.5, false, 'faint');
        this.doc.text(`Página ${page} de ${total}`, PAGE.width - MARGIN.right, footerY, { baseline: 'middle', align: 'right' });
      }
    }
  }

  toBlob(): Blob {
    this.decoratePages();
    return this.doc.output('blob');
  }
}

function base64(dataUrl: string) {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}
