# SPREAD_ 💸

**O jogo do crédito** — sobreviva 12 meses gerindo um fundo de crédito sem quebrar.

🎮 **[Jogue agora no navegador → fuzzionx.com/jogo](https://fuzzionx.com/jogo)** · grátis, sem cadastro, ~3 minutos

![status](https://img.shields.io/badge/status-no%20ar-4ADE80) ![stack](https://img.shields.io/badge/stack-React%20%2B%20AWS-0A0F0D)

![SPREAD_ — o jogo do crédito](capa.png)

---

## 🎯 O que é

SPREAD é um jogo educacional que transforma os bastidores do mercado de crédito em decisões rápidas de 3 minutos. Você assume um fundo de R$ 100 mil — sendo R$ 80 mil de investidores e **R$ 20 mil seus** (a cota subordinada) — e precisa atravessar 12 meses aprovando empréstimos, precificando risco e vendendo carteira, sem deixar os calotes zerarem o seu cofre.

Cada mecânica do jogo corresponde a um conceito real do mercado financeiro brasileiro.

## 🕹️ Como se joga

1. **Clientes chegam** com valor, prazo, score em estrelas e personalidade (😄 de boa / 🤨 pechincheiro)
2. **Você define a taxa**: 😇 baixa (todo mundo aceita), 🙂 justa ou 🤑 alta (mais lucro, mas o cliente pode recusar — e parcela pesada aumenta o risco de calote)
3. **Roda o mês**: parcelas entram, calotes explodem 💥, investidores cobram seu rendimento, eventos acontecem (Selic, crises, saques)
4. **Tokenize a carteira** 🪙: suas dívidas viram 10 tokens — escolha quantos vender por dinheiro imediato, com desconto
5. **Sobreviva 12 meses** 🏆 (ou encerre antes e leve sua nota 🏁; zerou o cofre = 💀)

## 📚 O que o jogo ensina (mecânica → conceito real)

| No jogo | No mercado real |
|---|---|
| Seu cofre de R$ 20 mil que absorve calotes | **Cota subordinada** — o colchão que protege o investidor sênior em FIDCs |
| Os R$ 80 mil que rendem contra você todo mês | **Funding** — custo de captação (CDI + spread) |
| Juros do cliente − custo do funding − calotes | **Spread** — de onde vem o lucro de quem opera crédito (daí o nome do jogo) |
| Vender a carteira com desconto | **Cessão de crédito com deságio** |
| Carteira fatiada em 10 tokens | **Tokenização / RWA** — fracionar recebíveis para ampliar a base de compradores |
| Lote maior = desconto maior; mercado 🥶 limita a venda | **Liquidez** — o preço de sair de uma posição depende do apetite do comprador |
| Taxa alta → mais calote | **Seleção adversa** — parcela que sufoca o cliente aumenta a inadimplência |
| Cartões de Selic mudando seu custo | **Política monetária** afetando o custo de capital |
| R$ 800/mês de custo fixo | **Opex** — operação parada também queima caixa |

## ⚖️ Balanceamento por simulação

Os parâmetros do jogo não foram chutados: foram calibrados rodando **milhares de partidas simuladas** com estratégias diferentes (conservadora, gananciosa, giradora). Resultado: aprovar tudo no piloto automático perde mais do que ganha; selecionar bem vence ~74%; dominar o giro da carteira vence ~93% com o triplo do lucro. Estratégia importa.

Curiosidade: o risco de calote do jogo é propositalmente **maior** que o real (a inadimplência brasileira ronda 4% *ao ano*; no jogo, clientes arriscados passam disso *por mês*). Na vida real, o spread é desenhado para o banco quase nunca perder — mas jogo sem risco de perder não diverte ninguém. 😄

## 🛠️ Stack

- **React** (componente único, sem backend, sem dependências de UI)
- **Web Audio API** — todos os sons e a música ambiente são sintetizados no navegador, zero arquivos de áudio
- **Hospedagem**: AWS S3 + CloudFront (site estático)

### Rodar localmente

```bash
git clone https://github.com/FuzzionX545/spread.git
cd spread
npm install
npm run dev
```

O jogo abre no navegador (endereço local exibido no terminal). Para gerar a versão de produção: `npm run build`.

## 🗺️ Roadmap

- [ ] Ranking de notas compartilhável
- [ ] Modo infinito para quem zerar
- [ ] Novas mecânicas e eventos de mercado

## ⚠️ Aviso

Simulação **educacional** com dinheiro fictício e números simplificados. Não é recomendação de investimento, nem produto financeiro, nem retrata integralmente a regulação do mercado brasileiro.

## 👤 Autor

**João Victor Silveira** — fundador da [FuzzionX](https://fuzzionx.com). Estudo o mercado financeiro e construo software de ponta a ponta (React, AWS serverless, automação com IA).

- 💼 [LinkedIn](https://www.linkedin.com/in/joaovsilveira)
- 🤖 [Converse com minha versão de IA no WhatsApp](https://fuzzionx.com/ia)
- 📫 hello@fuzzionx.com

*Se o jogo te ensinou algo, deixa uma ⭐ no repositório!*
