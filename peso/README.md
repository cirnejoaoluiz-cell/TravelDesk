# Déficit — controle de perda de peso

Web app mobile-first (React + Vite + Tailwind), instalável no celular (PWA). Os dados ficam no `localStorage` do aparelho (chave `deficit:data`), com exportação/importação de backup em JSON (Ajustes → Backup).

**Site:** https://cirnejoaoluiz-cell.github.io/TravelDesk/peso/ (publicado junto com o TravelDesk pelo `.github/workflows/deploy.yml`).
Para instalar: abra no celular → Compartilhar / menu → **Adicionar à tela de início**.

## Executar

```bash
cd peso
npm install
npm run dev      # http://localhost:5173
npm test         # testes dos cálculos
npm run build    # gera dist/
```

## Regras de cálculo (`src/lib/calc.ts`)

| O quê | Fórmula |
| --- | --- |
| TMB | Mifflin-St Jeor: 10·peso + 6,25·altura − 5·idade + 5 (H) / −161 (M) |
| Gasto base | TMB × 1,3 (exercício entra à parte), usando a última pesagem até o dia |
| Meta | kg × 7.700 kcal ÷ semanas (semanal) ÷ 7 (diária); aviso se > 1% do peso/semana |
| Musculação | 4,5 MET × peso × horas |
| Futebol | 7 MET × peso × horas |
| Esteira | por segmento: MET(velocidade) × peso × horas; MET interpolado em 6,0→4,8 · 6,5→5,0 · 7,0→6,0 · 8,0→8,3 · 10,0→9,8 |
| Déficit do dia | (gasto base + exercício) − consumido (positivo = déficit) |
| Proteína | meta de 2 g/kg |

- Dia **sem refeição lançada** não entra no acumulado (aparece como "sem registro").
- **Dia livre** com estimativa usa a estimativa como consumo; em branco conta como déficit 0.
- Semanas contadas a partir da data de início do plano. "Quanto falta por dia" = (meta − déficit dos dias já encerrados) ÷ dias restantes, incluindo hoje.
- Gráfico de peso: pesagens, média móvel de 7 dias corridos, linha da meta e peso previsto pelo déficit acumulado (÷ 7.700).
