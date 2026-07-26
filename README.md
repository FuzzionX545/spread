# SPREAD_ 💸

**Simulador do mercado de crédito** — sobreviva 12 meses no comando do seu próprio banco.

🎮 **[Jogue agora no navegador → fuzzionx.com/spread](https://fuzzionx.com/spread)** · grátis, sem cadastro, direto no navegador

![status](https://img.shields.io/badge/status-no%20ar-4ADE80) ![stack](https://img.shields.io/badge/stack-React%20%2B%20AWS-0A0F0D)

![SPREAD_ — simulador do mercado de crédito](capa.png)

---

## 🎯 O que é

SPREAD é um simulador educacional que transforma os bastidores do mercado de crédito em decisões rápidas. Você comanda um fundo de crédito PME de **R$ 1 milhão** — R$ 800 mil de investidores e **R$ 200 mil seus** (a cota subordinada) — e precisa atravessar 12 meses aprovando empréstimos, precificando risco e vendendo carteira, sem deixar os calotes zerarem o seu cofre. Escolha o mercado: 🕊️ calmo, ⚖️ normal ou 💀 brabo.

Cada mecânica do jogo corresponde a um conceito real do mercado financeiro brasileiro.

## 🕹️ Como se joga

1. **Empresas chegam** pedindo de R$ 40 a 160 mil — com faturamento, histórico de crédito, tempo de porta aberta, score em estrelas e, às vezes, recebíveis em garantia 🧾
2. **Você define a taxa**: 😇 baixa (todo mundo aceita), 🙂 justa ou 🤑 alta (mais lucro, mas o cliente pode recusar — e parcela pesada aumenta o risco de calote)
3. **Roda o mês**: parcelas entram, calotes explodem 💥 (e você decide: acordo à vista ou Serasa + justiça), investidores cobram seu rendimento, eventos acontecem (Selic, crises, saques)
4. **Tokenize a carteira** 🪙: suas dívidas viram 10 tokens — escolha quantos vender por dinheiro imediato, com desconto
5. **Sobreviva 12 meses** 🏆 (ou encerre antes e leve sua nota 🏁; zerou o cofre = 💀)

## 📚 O que o jogo ensina (mecânica → conceito real)

| No jogo | No mercado real |
|---|---|
| Seu cofre de R$ 200 mil que absorve calotes | **Cota subordinada** — o colchão que protege o investidor sênior em FIDCs |
| Os R$ 800 mil que rendem contra você todo mês | **Funding** — custo de captação (CDI + spread) |
| Juros do cliente − custo do funding − calotes | **Spread** — de onde vem o lucro de quem opera crédito (daí o nome do jogo) |
| Vender a carteira com desconto | **Cessão de crédito com deságio** |
| Carteira fatiada em 10 tokens | **Tokenização / RWA** — fracionar recebíveis para ampliar a base de compradores |
| Lote maior = desconto maior; mercado 🥶 limita a venda | **Liquidez** — o preço de sair de uma posição depende do apetite do comprador |
| Taxa alta → mais calote | **Seleção adversa** — parcela que sufoca o cliente aumenta a inadimplência |
| Acordo (35% na hora) × justiça (65% ou nada, meses depois) | **Recuperação de crédito** — renegociação, Serasa e execução |
| Cliente com 🧾 aceita juro menor e quase não dá calote | **Trava de recebíveis** — garantia via fluxo (Res. CMN 4.734) |
| Cartões de Selic mudando seu custo | **Política monetária** afetando o custo de capital |
| R$ 9.000/mês de custo fixo | **Opex** — operação parada também queima caixa |

## ⚖️ Balanceamento por simulação

Os parâmetros do jogo não foram chutados: foram calibrados rodando **milhares de partidas simuladas** com estratégias diferentes (conservadora, gananciosa, giradora). Resultado (5.000 partidas por estratégia): aprovar tudo no piloto automático quebra em até 69% das vezes; jogando bem, a sobrevivência vai de ~92% no mercado calmo a ~69% no brabo. A Selic inicial é a real (14,25%) e o investidor recebe CDI + 3,6% a.a. — faixa verdadeira de cota sênior de FIDC. Estratégia importa.

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
- 📫 hello@fuzzionx.com

*Se o jogo te ensinou algo, deixa uma ⭐ no repositório!*
