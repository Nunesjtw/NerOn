<div align="center">

# Nero

**Chamadas de voz, compartilhamento de tela e chat em tempo real — direto no navegador.**

Um app de comunicação leve e auto-hospedável, com identidade visual *cyber-minimalista*, feito com WebRTC e Socket.IO.

![Node](https://img.shields.io/badge/Node.js-%E2%89%A5%2018-3c873a?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-e8893a?style=flat-square&logo=webrtc&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS-f7df1e?style=flat-square&logo=javascript&logoColor=black)

</div>

---

## Sobre o projeto

O **Nero** é uma plataforma de comunicação em tempo real inspirada nos apps de comunidade modernos. Você entra em um canal de voz, conversa com a sua turma, transmite a tela em até 1080p/60 fps e troca mensagens, imagens e emojis no chat — tudo sem instalar nada e sem depender de serviços de terceiros.

O áudio e a tela viajam **ponto a ponto (WebRTC)** entre os participantes; o servidor Node.js cuida apenas da sinalização, da lista de canais, da presença e do chat. O resultado é uma aplicação pequena, rápida e fácil de hospedar em qualquer máquina com Node.

O front-end é escrito em **JavaScript puro (sem frameworks e sem etapa de build)**, com uma identidade visual própria: fundo cinza-asfalto, destaques em branco e bronze, títulos em fonte *dot matrix*, vidro fosco (glassmorphism) e efeitos sutis de CRT.

## Funcionalidades

### Voz e tela
- **Canais de voz** criados na hora por qualquer usuário (o servidor já sobe com `Geral` e `Jogos`).
- **Áudio P2P via WebRTC** com cancelamento de eco, supressão de ruído e controle automático de ganho.
- **Compartilhamento de tela** com seletor de qualidade: 720p ou 1080p, a 30 ou 60 fps — a mudança vale na hora, mesmo durante a transmissão.
- **Tela cheia** nas telas compartilhadas.
- **Mutar microfone** e **ensurdecer** com um clique; o ícone de mute aparece para todos no canal.
- **Anel de fala** no avatar de quem está falando.
- **Volume individual** de cada participante, lembrado pelo nome.
- **Indicador de ping** com a latência real da conexão WebRTC.
- **Sons de entrada e saída** da call.

### Chat
- **Chat por canal**, com histórico das últimas 100 mensagens para quem entra depois.
- **Envio de imagens** pelo botão de anexo ou colando com `Ctrl+V` (print screen), com prévia antes de enviar.
- **Zoom** ao clicar em uma imagem do chat.
- **Seletor de emojis** em popup de vidro fosco, com inserção na posição do cursor.
- Indicador **"fulano está digitando…"**.
- Contador de mensagens não lidas na aba (celular) e no título da página.

### Presença
- **Rich Presence**: defina o que você está fazendo — *Online*, *Codando*, *Jogando*, *Focado* ou um status personalizado de até 24 caracteres.
- Lista **Online** com todos os conectados, seus status e em qual canal cada um está.

### Experiência
- Fundo animado em canvas (fluxo de dados convergindo para um nó) quando nenhum canal está selecionado.
- Títulos de canal com efeito **CRT + glitch**.
- Mascote que acompanha o mouse com o olhar.
- Layout **responsivo**: no celular, a interface vira três abas (Canais, Chamada e Chat).
- Respeita a preferência **"reduzir movimento"** do sistema.
- Código de acesso opcional para restringir quem pode entrar.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Servidor | Node.js, Express 4 |
| Tempo real | Socket.IO 4 (WebSocket) |
| Áudio e tela | WebRTC (STUN/TURN configuráveis) |
| Front-end | HTML, CSS e JavaScript puro |
| Tipografia | Inter e Doto (Google Fonts) |

## Como rodar

**Pré-requisito:** [Node.js](https://nodejs.org) 18 ou superior.

```bash
# 1. clone o repositório e entre na pasta
git clone <url-do-repositorio>
cd <pasta-do-projeto>

# 2. instale as dependências
npm install

# 3. inicie o servidor
npm start
```

Abra **http://localhost:3000**, escolha um nome e entre em um canal de voz.

> **Importante:** os navegadores só liberam microfone e compartilhamento de tela em `localhost` ou em páginas servidas por **HTTPS**. Para usar o Nero com outras pessoas, publique-o atrás de um certificado válido (por exemplo, com um proxy reverso como Caddy ou Nginx).

### Variáveis de ambiente

| Variável | Descrição | Padrão |
| --- | --- | --- |
| `PORT` | Porta do servidor | `3000` |
| `ACCESS_CODE` | Se definida, só entra quem informar esse código | *(vazio — acesso livre)* |
| `TURN_URL` | Servidor(es) TURN, separados por vírgula (ex.: `turn:meu.servidor:3478`) | *(não usado)* |
| `TURN_USER` | Usuário do TURN | — |
| `TURN_PASS` | Senha do TURN | — |

Exemplo:

```bash
ACCESS_CODE=segredo PORT=8080 npm start
```

#### Sobre o TURN

Por padrão o Nero usa o STUN público do Google, o que funciona na maioria das redes. Quando os participantes estão atrás de NATs restritivos (redes corporativas, 4G/CGNAT), a conexão P2P pode falhar — nesses casos configure um servidor **TURN** (como o [coturn](https://github.com/coturn/coturn)) pelas variáveis acima.

## Estrutura do projeto

```
.
├── server.js               # Express + Socket.IO: canais, presença, sinalização e chat
├── package.json
└── public/
    ├── index.html
    ├── sounds/             # join.wav, leave.wav
    ├── css/                # um arquivo por assunto (base, sidebar, chat, call, dropdown…)
    └── js/                 # um arquivo por assunto
        ├── connection.js   # nome, código de acesso e socket
        ├── call.js         # entrar e sair de canais
        ├── webrtc.js       # pares, sinalização e faixas recebidas
        ├── screen-share.js # compartilhamento de tela e qualidade
        ├── chat.js         # mensagens, imagens, emojis e envio
        ├── presence.js     # status de atividade e lista Online
        ├── speaking.js     # detecção de quem está falando
        └── ui.js           # redesenho da interface
```

## Eventos em tempo real

A comunicação entre cliente e servidor acontece via Socket.IO.

**Cliente → servidor**

| Evento | Descrição |
| --- | --- |
| `create` | Cria um canal de voz |
| `join` / `leave` | Entra ou sai de um canal (o `join` devolve pares e histórico) |
| `signal` | Repassa ofertas, respostas e candidatos ICE do WebRTC |
| `chat` | Envia uma mensagem: `{ text, image }` (a imagem é um data URL em Base64) |
| `typing` | Avisa que está digitando |
| `muted` / `share` | Estado do microfone e da transmissão de tela |
| `status` | Atualiza o status de atividade |

**Servidor → cliente**

| Evento | Descrição |
| --- | --- |
| `channels` | Lista de canais com seus membros |
| `users` | Todos os conectados e seus status |
| `peer:joined` / `peer:left` | Alguém entrou ou saiu do seu canal |
| `chat` | Nova mensagem no canal |
| `typing`, `peer:share`, `signal` | Eventos repassados dentro da call |

## Imagens no chat

- Formatos aceitos: **PNG, JPG, WebP e GIF** (SVG é bloqueado de propósito).
- Imagens estáticas são **reduzidas no navegador** (lado maior de 1280 px) antes do envio, o que mantém o tráfego leve — inclusive com prints de telas grandes.
- GIFs seguem sem recompressão para preservar a animação, com limite de 1,5 MB.
- O servidor **valida o formato e o tamanho** de cada imagem e guarda as 20 mais recentes de cada canal no histórico.

## Notas e limitações

- Canais, mensagens e presença ficam **em memória**: ao reiniciar o servidor, tudo volta ao padrão.
- A topologia de chamada é **malha P2P** (cada participante conecta com todos os outros), ideal para grupos pequenos. Para salas grandes, o caminho natural é adotar um SFU.
- O Nero não tem contas nem senhas: o nome é escolhido no primeiro acesso e guardado no navegador. Use o `ACCESS_CODE` para limitar o acesso.

## Roadmap

- [ ] Persistência de canais e mensagens
- [ ] Arrastar e soltar imagens no chat
- [ ] Respostas e reações em mensagens
- [ ] Notificações do navegador
- [ ] Suporte a SFU para salas maiores

---

<div align="center">

Feito com café, WebRTC e um coelhinho de óculos. 🐰

</div>
