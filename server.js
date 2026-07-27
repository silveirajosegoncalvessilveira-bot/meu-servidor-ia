require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// ⚙️ CONFIGURAÇÕES GERAIS
app.use(cors({ origin: "*" }));
app.use(express.json());
const PORT = process.env.PORT || 3000;

// 🔑 CHAVES DE ACESSO (ficam seguras no servidor)
const CHAVES = {
  huggingface: process.env.HF_TOKEN,
  groq: process.env.GROQ_KEY,
  openrouter: process.env.OR_KEY
};

// 🧠 FUNÇÕES DAS IAS GRATUITAS INTEGRADAS
async function gerarTextoLlama(prompt) {
  const r = await axios.post('https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct',
    { inputs: prompt }, { headers: { Authorization: `Bearer ${CHAVES.huggingface}` } });
  return r.data[0]?.generated_text || "Sem resposta";
}

async function gerarImagemStable(descricao) {
  const r = await axios.post('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
    { inputs: descricao }, { headers: { Authorization: `Bearer ${CHAVES.huggingface}` }, responseType: 'arraybuffer' });
  return `data:image/png;base64,${Buffer.from(r.data).toString('base64')}`;
}

async function raciocinioMistral(pergunta) {
  const r = await axios.post('https://api.groq.com/openai/v1/chat/completions',
    { model: 'mixtral-8x7b-32768', messages: [{role:'user', content: pergunta}] },
    { headers: { Authorization: `Bearer ${CHAVES.groq}` } });
  return r.data.choices[0].message.content;
}

async function criarAgenteGemma(especificacoes) {
  const r = await axios.post('https://openrouter.ai/api/v1/chat/completions',
    { model: 'google/gemma-7b-it', messages: [{role:'user', content: `Crie prompt para IA: ${especificacoes}`}] },
    { headers: { Authorization: `Bearer ${CHAVES.openrouter}` } });
  return r.data.choices[0].message.content;
}

// 🚪 ROTA PRINCIPAL UNIFICADA
app.post('/api/unificado', async (req, res) => {
  try {
    const { tipo, entrada } = req.body;
    let resultado;
    switch (tipo) {
      case "texto": resultado = await gerarTextoLlama(entrada); break;
      case "imagem": resultado = await gerarImagemStable(entrada); break;
      case "raciocinio": resultado = await raciocinioMistral(entrada); break;
      case "criar-agente": resultado = { prompt_ia: await criarAgenteGemma(entrada) }; break;
      default: return res.status(400).json({erro: "Tipo inválido"});
    }
    res.json({ sucesso: true, resultado });
  } catch (erro) {
    res.status(500).json({erro: erro.message });
  }
});

// 🧩 WIDGET VISUAL AZUL COM LOGO "W"
app.get('/widget-ia-unificado.js', (req, res) => {
  res.type('application/javascript').send(`
window.IAMestreW = {
  async iniciar() {
    const div = document.createElement('div');
    div.innerHTML = \`
<style>
  .ia-w-fundo { position: fixed; bottom: 20px; right: 20px; width: 360px; border-radius: 16px; box-shadow: 0 8px 32px rgba(22, 93, 255, 0.2); overflow: hidden; font-family: 'Segoe UI', sans-serif; z-index: 99999; }
  .ia-w-cabecalho { background: #165DFF; color: white; padding: 14px; display: flex; align-items: center; gap: 10px; font-weight: bold; font-size: 18px; }
  .ia-w-logo { background: white; color: #165DFF; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 22px; }
  .ia-w-corpo { background: #f9fafc; height: 300px; overflow-y: auto; padding: 12px; }
  .ia-w-mensagem { margin: 8px 0; padding: 10px 14px; border-radius: 12px; max-width: 85%; line-height: 1.4; }
  .ia-w-usuario { background: #165DFF; color: white; margin-left: auto; }
  .ia-w-sistema { background: #e8f0ff; color: #0f3a8a; margin-right: auto; }
  .ia-w-form { display: flex; border-top: 1px solid #e0e6ed; }
  .ia-w-input { flex: 1; border: none; padding: 14px; font-size: 15px; outline: none; }
  .ia-w-botao { background: #165DFF; color: white; border: none; padding: 0 20px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .ia-w-botao:hover { background: #0f48cc; }
</style>
<div class="ia-w-fundo">
  <div class="ia-w-cabecalho"><div class="ia-w-logo">W</div>Assistente IA W</div>
  <div class="ia-w-corpo" id="ia-hist"></div>
  <form class="ia-w-form" onsubmit="event.preventDefault(); window.IAMestreW.enviar()">
    <input class="ia-w-input" id="ia-msg" placeholder="Escreva sua mensagem..." />
    <button class="ia-w-botao" type="submit">➤</button>
  </form>
</div>
    \`;
    document.body.appendChild(div.firstElementChild);
  },

  async enviar() {
    const msg = document.getElementById('ia-msg');
    const hist = document.getElementById('ia-hist');
    if (!msg.value.trim()) return;

    hist.innerHTML += \`<div class="ia-w-mensagem ia-w-usuario">\${msg.value}</div>\`;
    const texto = msg.value; msg.value = '';

    const res = await fetch('/api/unificado', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({tipo:'texto', entrada: texto})
    });
    const dados = await res.json();
    
    hist.innerHTML += \`<div class="ia-w-mensagem ia-w-sistema">\${dados.resultado || 'Erro na resposta'}</div>\`;
    hist.scrollTop = hist.scrollHeight;
  }
};

window.addEventListener('load', () => window.IAMestreW.iniciar());
console.log("✅ Sistema IA W carregado!");
  `);
});

app.listen(PORT, () => console.log(`✅ SERVIDOR RODANDO NA PORTA ${PORT}`));
