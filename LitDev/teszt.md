# 🚀 Projekt Áttekintés

Ez a dokumentum bemutatja, hogyan néz ki a Markdown a valóságban. Hello!
---

## 🛠 Használt Technológiák
Itt egy táblázat a rendszerről:

| Komponens | Technológia | Állapot |
| :--- | :--- | :--- |
| **Frontend** | Lit.dev | ✅ Kész |
| **Backend** | Node.js | 🏗️ Folyamatban |
| **Adatbázis** | SQL Server | 🔴 Tervezés alatt |

## 🔗 Hasznos Linkek és Képek
* [Lit.dev hivatalos oldal](https://lit.dev)
* [Node.js dokumentáció](https://nodejs.org)

### Egy fontos kép a struktúráról:
![Fejlesztői folyamat](https://raw.githubusercontent.com/lucasdemarchi/codespell/master/docs/images/logo.png)
*(Ez csak egy példa logó, bármilyen webes kép linkjét beteheted ide!)*

## 💡 Kód részlet (Syntax Highlighting)
Így látja az AI és te is a kódot:

```javascript
// Egy egyszerű Lit komponens alapja
import { LitElement, html } from 'lit';

export class MyGreeting extends LitElement {
  render() {
    return html`<h1>Üdvözöllek a projektben!</h1>`;
  }
}