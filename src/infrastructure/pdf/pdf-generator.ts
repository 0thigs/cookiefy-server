import { launch } from 'puppeteer';

export async function generateRecipePdfFromHtml(html: string) {
  const browser = await launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

export function buildRecipeHtml(recipe: any) {
  const escapeHtml = (str: any) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const ingredients = recipe.ingredients || [];
  const ingredientsHtml = ingredients.length
    ? ingredients
        .map((i: any) => {
          const name = escapeHtml(i.name ?? i.ingredient?.name ?? i.note ?? 'Ingrediente');
          const amount = i.amount ?? i.quantity ?? '';
          const unit = i.unit ?? '';
          const amountText = amount ? `${escapeHtml(amount)} ${escapeHtml(unit)}` : '';
          return `<li><span class="ing-amount">${amountText}</span> <span class="ing-name">${name}</span></li>`;
        })
        .join('')
    : `<p class="muted">Nenhum ingrediente listado.</p>`;

  const steps = recipe.steps || [];
  const stepsHtml = steps.length
    ? steps
        .map((s: any, idx: number) => {
          let text = '';
          if (s === null || s === undefined) text = '';
          else if (typeof s === 'string') text = s;
          else if (typeof s === 'object') {
            text = s.text ?? s.description ?? s.content ?? s.instruction ?? JSON.stringify(s);
          } else {
            text = String(s);
          }
          text = escapeHtml(text);
          return `<div class="step"><div class="step-title">Passo ${idx + 1}</div><div class="step-body">${text}</div></div>`;
        })
        .join('')
    : `<p class="muted">Nenhum modo de preparo disponível.</p>`;

  const author = recipe.author ? escapeHtml(recipe.author.name ?? recipe.author) : null;
  const authorPhoto = recipe.author?.photoUrl ? escapeHtml(recipe.author.photoUrl) : null;
  const prep = recipe.prepMinutes ?? recipe.prepTime ?? null;
  const cook = recipe.cookMinutes ?? recipe.cookTime ?? null;
  const servings = recipe.servings ?? null;
  const nutrition = recipe.nutrition ?? null;
  const nutritionHtml = nutrition
    ? `<div class="nutrition-row"><div><strong>Calorias</strong><div class="nut-val">${escapeHtml(nutrition.calories ?? '-')}</div></div><div><strong>Proteína</strong><div class="nut-val">${escapeHtml(nutrition.protein ?? '-')} g</div></div><div><strong>Carboidratos</strong><div class="nut-val">${escapeHtml(nutrition.carbs ?? '-')} g</div></div><div><strong>Gordura</strong><div class="nut-val">${escapeHtml(nutrition.fat ?? '-')} g</div></div></div>`
    : `<p class="muted">Sem informação nutricional.</p>`;


          return `
          <!doctype html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width,initial-scale=1" />
              <title>${escapeHtml(recipe.title ?? 'Receita')}</title>
              <style>
                :root { --app-orange: #ff7a2d; --muted:#777; --bg:#ffffff; }
                body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #222; margin: 0; padding: 0; background: #fafafa; }
                .wrap { width: 760px; margin: 18px auto; padding: 0; background: var(--bg); }
                .topbar { background: var(--app-orange); padding: 14px 0; text-align:center; }
                .topbar-title { color: white; font-weight:700; font-size:20px; }
                .hero { display:flex; gap:20px; align-items:center; }
                .cover { width: 160px; height: 120px; object-fit: cover; border-radius: 8px; background:#eee; }
                h1 { font-size: 28px; margin: 0; color: #111; }
                .subtitle { color: var(--muted); margin-top:6px; }
                .meta { margin-top:8px; color: #555; font-size:13px; }
                .author { display:flex; gap:10px; align-items:center; margin-top:10px; }
                .author img { width:40px; height:40px; border-radius:50%; object-fit:cover; }
                .section { margin-top:20px; }
                .nutrition-row { display:flex; gap:18px; justify-content:flex-start; align-items:baseline; }
                .nutrition-row > div { min-width:120px; }
                .nutrition-row .nut-val { margin-top:6px; font-size:14px; color:#111; }
                .section h3 { display:flex; align-items:center; gap:10px; font-size:16px; margin:0 0 8px 0; color:var(--app-orange); }
                .ingredients { padding-left:18px; }
                .ingredients li { margin:6px 0; }
                .ing-amount { color:#444; font-weight:600; margin-right:8px; }
                .step { margin-bottom:14px; }
                .step-title { font-weight:700; color:#333; margin-bottom:6px; }
                .step-body { white-space:pre-wrap; color:#222; }
                .muted { color:var(--muted); font-style:italic; }
                footer { margin-top:26px; color:#999; font-size:12px; text-align:center; }
              </style>
            </head>
            <body>
              <div class="wrap">
                <header class="topbar"><div class="topbar-title">${escapeHtml(recipe.title ?? 'Receita')}</div></header>

                <div style="padding:18px 6px 0 6px">
                  <div class="hero">
                    ${recipe.imageUrl ? `<img class="cover" src="${escapeHtml(recipe.imageUrl)}" alt="${escapeHtml(recipe.title)}"/>` : ''}
                    <div>
                      <div class="subtitle">${recipe.description ? escapeHtml(recipe.description) : '<span class="muted">Sem descrição</span>'}</div>
                      <div class="meta">${author ? `Por ${author}` : 'Autor desconhecido'}${prep ? ` • Preparo ${escapeHtml(prep)} min` : ''}${cook ? ` • Cozimento ${escapeHtml(cook)} min` : ''}${servings ? ` • Rende ${escapeHtml(servings)}` : ''}</div>
                      ${authorPhoto ? `<div class="author"><img src="${authorPhoto}" alt="author"/><div>${author}</div></div>` : ''}
                    </div>
                  </div>

                  <div class="section">
                    <h3>Informação nutricional</h3>
                    ${nutritionHtml}
                  </div>

                  <div class="section">
                    <h3>Ingredientes</h3>
                    <ul class="ingredients">${ingredientsHtml}</ul>
                  </div>

                  <div class="section">
                    <h3>Modo de preparo</h3>
                    ${stepsHtml}
                  </div>

                  <footer>Gerado pelo Cookiefy • ${new Date().toLocaleDateString()}</footer>
                </div>
              </div>
            </body>
          </html>
          `;
    }