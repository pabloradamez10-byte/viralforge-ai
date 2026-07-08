import { useState } from "react";

type Result = {
  title: string;
  score: number;
  hook: string;
  script: string;
  hashtags: string[];
};

export default function App() {
  const [niche, setNiche] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  function generateIdeas() {
    const base = niche || "conteúdo viral";

    setResults([
      {
        title: `3 erros que quase todo mundo comete em ${base}`,
        score: 94,
        hook: `Você provavelmente está errando isso em ${base} e nem percebeu.`,
        script: `Comece mostrando um erro comum. Explique rapidamente por que isso prejudica o resultado. Depois mostre a forma correta e finalize com uma pergunta para gerar comentários.`,
        hashtags: [`#${base.replaceAll(" ", "")}`, "#viral", "#dicas", "#conteudo"],
      },
      {
        title: `O jeito mais simples de começar em ${base}`,
        score: 88,
        hook: `Se eu fosse começar em ${base} hoje, faria exatamente isso.`,
        script: `Mostre um passo a passo simples. Use frases curtas, cortes rápidos e uma dica prática no final.`,
        hashtags: [`#${base.replaceAll(" ", "")}`, "#iniciante", "#aprendizado", "#shorts"],
      },
      {
        title: `Ninguém te conta isso sobre ${base}`,
        score: 82,
        hook: `O que ninguém te fala sobre ${base} é isso aqui.`,
        script: `Crie curiosidade nos primeiros 3 segundos. Revele uma informação útil e finalize incentivando a pessoa a salvar o vídeo.`,
        hashtags: [`#${base.replaceAll(" ", "")}`, "#curiosidade", "#reels", "#tiktok"],
      },
    ]);
  }

  return (
    <main style={{ minHeight: "100vh", padding: 32, fontFamily: "Arial", background: "#0b0f19", color: "#fff" }}>
      <h1>ViralForge AI</h1>
      <p>Copiloto para criar ideias de vídeos com potencial viral.</p>

      <div style={{ marginTop: 24 }}>
        <input
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          placeholder="Digite seu nicho. Ex: finanças, IA, curiosidades..."
          style={{ padding: 14, width: "60%", borderRadius: 8, border: "1px solid #333" }}
        />
        <button
          onClick={generateIdeas}
          style={{ padding: 14, marginLeft: 12, borderRadius: 8, border: 0, cursor: "pointer" }}
        >
          Gerar oportunidades
        </button>
      </div>

      <section style={{ marginTop: 32, display: "grid", gap: 20 }}>
        {results.map((item, index) => (
          <div key={index} style={{ background: "#111827", padding: 24, borderRadius: 12, border: "1px solid #243044" }}>
            <h2>{item.title}</h2>
            <strong>Score de oportunidade: {item.score}/100</strong>
            <p><b>Hook:</b> {item.hook}</p>
            <p><b>Roteiro:</b> {item.script}</p>
            <p><b>Hashtags:</b> {item.hashtags.join(" ")}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
