// test_github_connectivity.ts
// Test minimo e autonomo: verifica che l'ambiente dove gira server.ts
// riesca a raggiungere l'API di GitHub in uscita.
//
// USO:
//   1. Incolla questo file nel progetto (es. accanto a server.ts) oppure
//      incolla il contenuto della funzione dentro server.ts stesso e
//      chiamala una volta all'avvio.
//   2. Esegui con: npx tsx test_github_connectivity.ts
//      (o: node --loader ts-node/esm test_github_connectivity.ts)
//   3. Guarda l'output: se stampa "OK" con lo status della repo, la
//      connettività in uscita verso api.github.com funziona.
//      Se va in timeout o errore di rete, l'ambiente blocca l'uscita
//      (o serve un proxy/allowlist configurato da AI Studio).

async function testGitHubConnectivity() {
  const start = Date.now();
  console.log("[test] Provo a raggiungere api.github.com ...");

  try {
    // Endpoint pubblico, non richiede token: se questo fallisce,
    // il problema è di rete/DNS/firewall, non di autenticazione.
    const res = await fetch("https://api.github.com/zen", {
      headers: { "User-Agent": "ila-connectivity-test" },
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      console.error(`[test] FALLITO — status HTTP ${res.status} dopo ${elapsed}ms`);
      return;
    }

    const text = await res.text();
    console.log(`[test] OK — risposta in ${elapsed}ms`);
    console.log(`[test] GitHub Zen: "${text}"`);

    // Secondo test, opzionale: se hai già un token pronto, verifica
    // anche l'accesso autenticato a una repo privata specifica.
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_TEST_REPO; // es. "utente/nome-repo"

    if (token && repo) {
      console.log(`[test] Provo accesso autenticato a ${repo} ...`);
      const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "ila-connectivity-test",
          Accept: "application/vnd.github+json",
        },
      });
      if (repoRes.ok) {
        const data = await repoRes.json();
        console.log(`[test] OK — repo raggiunta: ${data.full_name}, privata: ${data.private}`);
      } else {
        console.error(`[test] Accesso repo FALLITO — status ${repoRes.status}`);
        const body = await repoRes.text();
        console.error(`[test] Dettaglio: ${body}`);
      }
    } else {
      console.log("[test] (Salto il test autenticato: imposta GITHUB_TOKEN e GITHUB_TEST_REPO per provarlo)");
    }
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error(`[test] FALLITO dopo ${elapsed}ms — errore di rete:`, err.message || err);
    console.error("[test] Possibili cause: uscita bloccata dall'ambiente, DNS non risolto, timeout/firewall.");
  }
}

testGitHubConnectivity();
