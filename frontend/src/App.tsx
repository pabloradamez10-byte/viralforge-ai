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
    const base = niche.trim() || "conteúdo viral";

    setResults([
      {
        title: `3 erros que quase todo mundo comete em ${base}`,
        score: 94,
        hook: `Você provavelmente está errando isso em ${base} e nem percebeu.`,
        script:
          "Comece mostrando um erro comum. Explique rapidamente por que isso prejudica o resultado. Depois mostre a forma correta e finalize com uma pergunta para gerar comentários.",
        hashtags: [
          `#${base.replace(/\s+/g, "")}`,
          "#viral",
          "#dicas",
          "#conteudo",
        ],
      },
      {
        title: `O jeito mais simples de começar em ${base}`,
        score: 88,
        hook: `Se eu fosse começar em ${base} hoje, faria exatamente isso.`,
        script:
          "Mostre um passo a passo simples. Use frases curtas, cortes rápidos e uma dica prática no final.",
        hashtags: [
          `#${base.replace(/\s+/g, "")}`,
          "#iniciante",
          "#aprendizado",
          "#shorts",
        ],
      },
      {
        title: `Ninguém te conta isso sobre ${base}`,
        score: 82,
        hook: `O que ninguém te fala sobre ${base} é isso aqui.`,
        script:
          "Crie curiosidade nos primeiros 3 segundos. Revele uma informação útil e finalize incentivando a pessoa a salvar o vídeo.",
        hashtags: [
          `#${base.replace(/\s+/g, "")}`,
          "#curiosidade",
          "#reels",
          "#tiktok",
        ],
      },
    ]);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#fff",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "40px",
            marginBottom: 5,
          }}
        >
          🚀 ViralForge AI
        </h1>

        <p
          style={{
            color: "#b8c2d1",
            marginBottom: 40,
            fontSize: "18px",
          }}
        >
          Descubra oportunidades antes delas viralizarem.
        </p>

        <div
          style={{
            display: "flex",
            gap: 15,
            marginBottom: 40,
          }}
        >
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Digite um nicho... Ex.: futebol, IA, curiosidades..."
            style={{
              flex: 1,
              padding: "16px",
              fontSize: "17px",
              borderRadius: "10px",
              border: "none",
              outline: "none",
              background: "#ffffff",
              color: "#000000",
            }}
          />

          <button
            onClick={generateIdeas}
            style={{
              padding: "16px 28px",
              fontSize: "16px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              background: "#2563eb",
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            🔍 Gerar oportunidades
          </button>
        </div>

        {results.map((item, index) => (
          <div
            key={index}
            style={{
              background: "#172033",
              padding: "24px",
              borderRadius: "12px",
              marginBottom: "20px",
              border: "1px solid #2d3b57",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#4ade80",
              }}
            >
              {item.title}
            </h2>

            <p>
              ⭐ <strong>Score:</strong> {item.score}/100
            </p>

            <p>
              🎣 <strong>Hook:</strong> {item.hook}
            </p>

            <p>
              📝 <strong>Roteiro:</strong>
              <br />
              {item.script}
            </p>

            <p>
              🏷️ <strong>Hashtags:</strong>{" "}
              {item.hashtags.join(" ")}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
