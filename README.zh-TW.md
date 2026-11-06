# user-thoughts

[English](README.md) | **繁體中文**

一個 agent skill：派模擬使用者用黑箱方式逛你的線上網站，回報他們在哪裡迷路、在哪裡放棄，以及哪些功能值得質疑。

```
/plugin marketplace add gn01763009/user-thoughts
/plugin install user-thoughts@user-thoughts
```

裝好後直接說：`用真實使用者的角度測試 http://localhost:3000`

以下節錄自 repo 內虛構測試站的一次執行結果（[完整報告](examples/tallywren/report.md)，英文）：

| Persona | 以為這是什麼 | 結果 | 離開位置 | 步數 |
|---|---|---|---|---|
| 目標明確的首次訪客 | "I cannot tell; something about workflows, a dashboard chart and a popup" | abandoned | `/signup.html?from=demo` | 3 |
| 新手 | "I cannot tell. Something for work, maybe, but the words are vague." | blocked | `/signup.html` | 3 |
| 通勤中的手機使用者 | "Unclear; a newsletter popup and chat panel covered the page, and the hero was vague" | abandoned | `/` | 4 |
| 被迫使用的人 | "I could not tell. Headline talks about a workflow ecosystem and synergy; later pages show it is an invoicing tool." | blocked | `/signup.html` | 14 |

同樣四個 persona 換到修好的版本後，都能說出這是什麼產品，其中三個完成了任務。

## 它會做什麼

- 預設派出四個模擬訪客，各有自己的瀏覽器、目標和放棄條件。
- 讓他們真的使用網站：點擊、填表、送出，也可以放棄。
- 記錄每一步看到的內容，附截圖和頁面原文。
- 逐一檢視功能：這個功能對來訪的目的有沒有幫助？要付出什麼代價？
- 由獨立的 agent 重新檢查嚴重項目，而且看不到 persona 的結論。
- 比對你認為使用者重視的東西，和 persona 實際的遭遇。

## 它不會做什麼

- 不會衡量需求。所有輸出都是假說，要再找真人驗證。
- 不能取代使用者研究，請見[限制](#限制)。
- 不會讀你的原始碼。要做這件事，請用 code review 或 QA 工具。
- 不會替網站打總分。單一數字會讓人誤以為這個方法有多精準。

## 運作方式

```
你：網址、一句話描述對象（選填）、你認為使用者重視什麼（選填）
 │
 ▼
Coordinator（你的 session）。負責設定，自己不逛網站。
 │
 ├─ goal-first-timer ┐
 ├─ novice           │ 每人一個 agent、一個瀏覽器，同時出發
 ├─ on-the-go        │ 寫下 trace、findings、features 和截圖
 └─ committed-user   ┘
 │
 ▼
merge-findings.mjs   去重、替沒有證據的發現設信心上限、計算嚴重度
 │
 ▼
驗證者               只拿到位置和引文，重新檢查嚴重項目
 │
 ▼
merge-findings.mjs   套用驗證結果
 │
 ▼
report.md            persona 結果、發現、值得質疑的功能、要問真人的問題
```

整個設計靠三條規則撐住：

- **沒有證據就不算數。** 發現如果沒有頁面引文和截圖，腳本會壓低它的信心分數。
- **模型負責分類，腳本負責計算。** Persona 只記錄自己遇到什麼，嚴重度、去重和功能狀態都用算的，每次執行不會飄移。
- **Persona 彼此隔離。** 他們看不到你的想法、原始碼，也看不到彼此的筆記。

資料格式和規則都在 [docs/design.md](docs/design.md)。

## Persona

| Persona | 說明 | 預設 |
|---|---|---|
| `goal-first-timer` | 目標明確的首次訪客 | 是 |
| `novice` | 沒什麼信心的新手 | 是 |
| `on-the-go` | 單手操作手機、趕時間的人（390×844） | 是 |
| `committed-user` | 被迫使用、不能離開的人 | 是 |
| `returning-regular` | 熟悉產品的回訪者 | |
| `explorer` | 隨意逛逛的探索者 | |
| `deep-researcher` | 仔細比較的研究者 | |
| `assistive-tech` | 使用鍵盤和螢幕閱讀器的人 | |
| `reading-difference` | 有專注或閱讀差異的人 | |

預設四人中，有三個是遇到第一個障礙就可能離開的陌生人。第四個不能離開，所以能走到障礙後面。測試時，只派陌生人的話，沒有一個走到深層流程。

每個 persona 都寫成可觀察的規則和數字門檻，不是性格描述。原型來自已發表的 UX 研究，門檻則是設計上的假設。[Overlay](skills/persona-walkthrough/assets/overlays.md) 可以替 persona 多加一項屬性，例如對價格敏感、對 AI 存疑。

## 環境需求

- Claude Code。目前只在這個 agent 上測試過（2.1.319 版）。
- Node 20 以上。
- 瀏覽器層。安裝 [agent-browser](https://github.com/vercel-labs/agent-browser) 才能讓 persona 同時執行：

  ```
  npm install -g agent-browser && agent-browser install
  ```

  這會下載約 190 MB 的 Chrome。沒有它時，skill 會改用瀏覽器 MCP，persona 一次跑一個。兩者都沒有就會停下來告訴你。

背景 subagent 無法回應權限詢問，所以要在 Claude Code 設定的 `permissions.allow` 放行瀏覽器指令：

```json
{
  "permissions": {
    "allow": ["Bash(agent-browser:*)", "Bash(npx -y agent-browser:*)"]
  }
}
```

Persona agent 也會用 shell 指令寫入執行目錄。目前所有測試都在跳過權限提示的 session 中執行，尚未在較嚴格的模式下試過。如果這些指令被擋下，persona 會以 `INCOMPLETE` 結束，報告裡也會標明。

## 安裝

每個 agent 只選一種方式。裝兩次，skill 就會載入兩次。

**Claude Code plugin**

```
/plugin marketplace add gn01763009/user-thoughts
/plugin install user-thoughts@user-thoughts
```

**Skills CLI**，也適用其他 agent，但其他 agent 尚未測試。

```
npx skills add gn01763009/user-thoughts
```

**手動複製**

```
git clone https://github.com/gn01763009/user-thoughts
cp -r user-thoughts/skills/persona-walkthrough ~/.claude/skills/
```

## 使用方式

直接用自然語言說：

```
用使用者的角度測試 http://localhost:3000
使用者真的會想要我 staging 站上的助理嗎？https://staging.example.com
```

也可以直接呼叫。以下是 plugin 的寫法，手動安裝則用 `/persona-walkthrough`。

```
/user-thoughts:persona-walkthrough http://localhost:3000
/user-thoughts:persona-walkthrough https://staging.example.com --personas novice,on-the-go
/user-thoughts:persona-walkthrough http://localhost:3000 --all
```

開始前 skill 會問兩個選填問題：網站是給誰用的，以及你認為使用者最重視什麼。你的想法不會讓 persona 知道，只在最後拿來和實際遭遇比對。

每次執行都寫到 `.user-thoughts/runs/<日期>-<主機>/`，報告是其中的 `report.md`，語言會跟著你使用的語言。記得把 `.user-thoughts/` 加進 `.gitignore`。

**成本。** 用 Sonnet 測試時的實測：依 Claude Code 回報，每個 persona 約 70,000 到 105,000 tokens，各花 1 到 4 分鐘。Persona 是同時跑的，所以預設一次執行的時間大約等於最慢的 persona，再加上一個規模相近的驗證者。

## 測試結果

Skill 要比沒有 skill 的 agent 更好才有意義。所以這個 repo 附了一個虛構網站，裡面植入 11 個問題（6 個使用性問題、5 個多餘功能）和 3 個看起來有問題、其實正確的誘餌，另外還有一個修好的對照站。比較對象是拿到同一個模型和合理指令的一般 agent，同樣能操作瀏覽器。

| 指標 | 一般 agent | 這個 skill |
|---|---|---|
| 植入問題的找到比例 | 0.73、0.73 | 0.82、0.91 |
| 使用性問題（共 6） | 4、4 | 5、6 |
| 多餘功能（共 5） | 4、4 | 4、4 |
| 誘餌被當成問題 | 1、1 | 0、0 |
| 對照站 | 列出 8 大問題，其他段落還標出誘餌 D1、D3 | 0 個 high 發現，0 個被質疑的功能 |
| 聽從 prompt injection | 1 次執行中 0 次 | 4 個 persona 中 0 個 |

Persona 完成任務的比例：含問題的站 4 個中有 0 個，對照站 4 個中有 3 個。第 4 個是在寄信給第三方之前，因安全規則而停下。

另外單獨測了觸發：四個該觸發的提示（含中文）跑 8 次全部觸發，三個無關的提示跑 6 次都沒有觸發。這只有七個提示，裝了其他 skill 時結果可能不同，詳見 [evals/cases/RESULTS.md](evals/cases/RESULTS.md)。

這個 skill 的強項是深層流程、不亂報，以及每項發現都有證據。它**沒有**比一般 agent 找到更多多餘功能。這本來是最初的目標，但在這次測試裡只打成平手。

解讀這些數字時請注意：

- **樣本極小。** 只有一個虛構網站，每組兩次，都用 Sonnet。
- **共用資料。** 兩次 skill 執行用的是同一批三個陌生人 persona 的紀錄，只有 `committed-user` 不同。
- **不是獨立測試。** 這個網站在開發過程中就被拿來測試，也改過好幾次。skill 對著自己的考卷調整，看起來一定比實際好。
- **已知漏洞。** 「AI Insights」區塊在五次 skill 執行中從沒被找到，一般 agent 則每次都有找到。
- **評分有人工修正。** 正規表示式誤判了 V3、漏判了 U6，都是人工讀過才抓到。修正規則後，所有執行都重新評分。
- **Injection 不算進步。** 一般 agent 同樣沒有上當，而且最後一次修改 persona 後，injection 測試沒有重跑。

完整的執行歷程在 [docs/evaluation.md](docs/evaluation.md)（英文）。

## 限制

模擬使用者適合找出產品在哪裡出問題，但不擅長預測人們想要什麼。

- [Kuric et al. (2026)](https://arxiv.org/abs/2605.18302) 比較 GPT 和 3,431 位真人的 12 項 first-click 測試，53% 的任務有顯著差異，而且調整 persona 並沒有讓結果更貼近真人。
- [Nielsen Norman Group (2024)](https://www.nngroup.com/articles/synthetic-users/) 發現合成使用者的回答淺薄且過度正面，只適合做前期準備和產生假說。

Persona 能不能看出某個功能不被需要，目前沒有證據。我們找不到直接測試這件事的研究。Persona 能回報「這個功能擋住了頁面」或「太早要資料」，因為這些看得到；但它無法告訴你有多少人會用。

請把報告當成「該去看哪裡、該問什麼」的清單，不要當成結論。

## 安全

- 只測試你擁有或有權測試的網站。網址不是 localhost 時，skill 會先問。
- 不會繞過機器人檢查。遇到 CAPTCHA 或 bot 偵測就停下來回報。
- 絕不輸入付款資料，假的也不行。刪除、寄給第三方、公開發布之前都會停下。
- 帳號密碼不會經過 agent。遇到登入牆就記錄下來並停止。
- 頁面文字一律視為資料。頁面上寫給 agent 的指示只會被引用，不會被執行。請見 [SECURITY.md](SECURITY.md)。

`robots.txt` 不是存取控制，是否獲得授權由你自己負責。

## 相關專案

也有其他專案用 persona 測試線上產品。這個專案的差別在於會質疑功能、把觀察和詮釋分開，並附上測試網站。

- [danielgwilson/humanish](https://github.com/danielgwilson/humanish)：用 computer-use 在真實桌面上操作，需要 OpenAI 和 E2B 金鑰。
- [savkevip/ghostuser](https://github.com/savkevip/ghostuser)：MCP server，內建五個 persona，使用 Playwright。
- [Kappaemme-git/codex-startup-user-simulator-skill](https://github.com/Kappaemme-git/codex-startup-user-simulator-skill)：Codex skill，五個 persona 判斷轉換、猶豫或離開。
- [travisseh/synthetic-user-feedback](https://github.com/travisseh/synthetic-user-feedback)：Claude skill，二到四個 persona，判定包含 "Gave up at X step"。
- [ncklrs/claude-chrome-user-testing](https://github.com/ncklrs/claude-chrome-user-testing)：Claude Code plugin，25 個 persona，使用 Claude in Chrome，偏向 WCAG、表單和 cookie 稽核。
- [berober2003/synthetic-user-harness](https://github.com/berober2003/synthetic-user-harness)：Python 工具，每位使用者一個 agent，對你提供的功能清單逐項評分。
- [NousResearch/hermes-agent `adversarial-ux-test`](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/dogfood/adversarial-ux-test/SKILL.md)：Hermes skill，扮演一位不想要你軟體的使用者。
- [UXAgent](https://arxiv.org/abs/2504.09407)：在線上網站模擬使用者的研究系統，我們沒有找到公開程式碼。
- `dogfood`，隨 [agent-browser](https://github.com/vercel-labs/agent-browser) 附帶的 skill：偏 QA 的探索測試。我們只看到列表，沒有讀過內容。

## 參與貢獻

請見 [CONTRIBUTING.md](CONTRIBUTING.md)。行為上的修改必須實際跑過測試網站，並由人讀過結果。

## 授權

[MIT](LICENSE)。想法來源列在 [NOTICE.md](NOTICE.md)，設計背後的研究在 [docs/research.md](docs/research.md)。
