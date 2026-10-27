# TravelDesk

Organizador pessoal de viagens: cadastre suas viagens e organize, para cada uma, **itinerário**, **roteiro**, **checklist** e **financeiro**.

## Site

**https://cirnejoaoluiz-cell.github.io/TravelDesk/**

Publicado automaticamente pelo GitHub Pages (`.github/workflows/deploy.yml`) a cada alteração no branch principal: o fluxo roda os testes, gera a versão de produção e publica.

No iPad/iPhone, abra o site no Safari → Compartilhar → **Adicionar à Tela de Início**. O TravelDesk abre como um app e o Safari deixa de apagar os dados do site após dias sem uso.

## Como executar

Requisitos: [Node.js](https://nodejs.org) 20 ou superior.

```bash
npm install        # instala as dependências (apenas na primeira vez)
npm run dev        # abre em http://localhost:5173
```

Outros comandos:

| Comando             | O que faz                                               |
| ------------------- | ------------------------------------------------------- |
| `npm run build`     | Verifica os tipos e gera a versão de produção em `dist/` |
| `npm run preview`   | Serve a versão de produção localmente                   |
| `npm test`          | Roda os testes automatizados (cálculos, roteiro, dados) |
| `npm run typecheck` | Verifica os tipos TypeScript                            |

| `npm run build:artifact` | Gera `dist-artifact/traveldesk.html`, versão de arquivo único para publicar no claude.ai |

A pasta `dist/` é estática e pode ser publicada em qualquer hospedagem (Netlify, Vercel, GitHub Pages…), sem configuração extra.

## Onde ficam os dados

**Publicado no claude.ai** (versão `build:artifact`): os dados ficam no banco do Artifact, numa área privada da sua conta (`data/users/<seu id>`), com um documento por viagem e a capa num documento separado. Eles aparecem em qualquer dispositivo onde você abrir o link. Implementação: `src/data/ClaudeDbTripRepository.ts`.

**Rodando localmente ou em hospedagem própria**: os dados ficam **no próprio navegador**, no `localStorage`, na chave `traveldesk:data` (um JSON versionado com todas as viagens). Isso significa que:

- os dados continuam salvos ao fechar ou atualizar a página;
- eles pertencem àquele navegador/dispositivo (outro navegador começa vazio);
- limpar os dados do site no navegador apaga as viagens.

Para segurança, use **Exportar backup** (rodapé) para baixar um arquivo `.json`, e **Importar** para restaurá-lo, inclusive em outro dispositivo. As imagens de capa são reduzidas automaticamente para caber no limite de ~5 MB do navegador.

Para inspecionar: DevTools → Application → Local Storage → `traveldesk:data`.

## Arquitetura

```
src/
  domain/          Modelo de dados e regras de negócio (sem React)
    types.ts         Tipos: Trip, ItineraryItem, Activity, ChecklistTask, Expense
    catalog.ts       Rótulos, categorias, moedas, tarefas sugeridas
    factories.ts     Criação e normalização de registros
    finance.ts       Cálculos: total, pago, pendente, parcelas, orçamento, câmbio
  data/            Persistência
    TripRepository.ts             Interface (contrato) de armazenamento
    LocalStorageTripRepository.ts Implementação no navegador (localStorage)
    ClaudeDbTripRepository.ts     Implementação no banco da conta (claude.ai)
    index.ts                      Escolhe a implementação usada pelo app
  platform/        Acesso aos recursos do claude.ai (banco, usuário, downloads)
  state/           TripsContext: estado global + operações (criar, editar, excluir)
  components/      UI reutilizável: Modal, Field, Menu, Toast, Confirm, ProgressBar…
  features/
    trips/           Página inicial, card e formulário de viagem
    trip/            Página da viagem e as quatro abas
      itinerary/ schedule/ checklist/ finance/
    backup/          Exportar/importar JSON
  lib/             Utilitários (datas, moeda, imagem, ids)
  styles/global.css  Design tokens (cores, raios, sombras) e estilos
```

Princípios:

- **Cada viagem é um documento independente** com todos os seus registros. Viagens não compartilham dados.
- **As telas nunca acessam o armazenamento diretamente**: tudo passa por `TripRepository`, que é assíncrono.
- **Regras de negócio ficam em `domain/`**, testáveis sem interface.

### Migrar para um banco na nuvem

1. Crie uma classe que implemente `TripRepository` (ex.: `SupabaseTripRepository`, `FirebaseTripRepository` ou uma API própria). O formato `Trip` mapeia direto para um documento JSON, ou pode ser dividido em tabelas (`trips`, `itinerary_items`, `activities`, `tasks`, `expenses`) com `trip_id`.
2. Troque a implementação em `src/data/index.ts`.
3. Use o arquivo de backup exportado para importar os dados existentes.
4. Para imagens, troque `src/lib/image.ts` por upload em um storage de arquivos e salve apenas a URL em `coverImage`.

A chave do `localStorage` guarda um `version`; mudanças futuras de formato podem ser migradas em `LocalStorageTripRepository.read()`, e campos novos são completados automaticamente por `normalizeTrip()`.

## Funcionalidades

- **Minhas viagens**: cards com capa, destinos e datas, separados em próximas / sem data / anteriores; criar, abrir, editar e excluir.
- **Itinerário**: voos, trens, ônibus, carros, barcos e hospedagens, com datas, horários, endereço (abre no mapa), localizador (copiar com um toque), link e observações. Ordem cronológica, agrupado por dia.
- **Roteiro**: atividades por dia (gerados a partir das datas da viagem) e por cidade (filtro), com categoria, horário, endereço, link e notas; marcar como concluída, reordenar (↑/↓) ou ordenar por horário.
- **Checklist**: tarefas com prazo opcional, destaque para atrasadas e próximas, progresso geral e lista de sugestões.
- **Financeiro**: despesas com categoria, valor, moeda, data e status (pago, pendente, parcelado com controle de parcelas); totais de registrado/pago/pendente, comparação com o orçamento e distribuição por categoria. Despesas em outra moeda entram nos totais quando você informa a cotação.
