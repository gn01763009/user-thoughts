# User Thoughts：從別人的造訪，看你的產品

[![CI](https://github.com/gn01763009/user-thoughts/actions/workflows/ci.yml/badge.svg)](https://github.com/gn01763009/user-thoughts/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | **繁體中文**

做產品的時候，你只看得到自己這一邊。這個 agent skill 會派處境各不相同的模擬人物，實際逛一趟你的線上網站，每人只來一次：有人站在捷運上、手邊只有手機；有人從來沒做過這件事；有人是老闆規定一定要用。他們真的動手操作，你會讀到每個人在每一步想了什麼，並附上他們當下看到的畫面截圖。

目的是幫你做出符合自己願景的決定。它不是投票，也不預測需求。它回報的一切都是假說，要再找真人驗證。

> **目前的狀況。** 在測試站上，v1 沒有達到自己設定的「找出已知問題」門檻。使用前請先讀[結果](#結果)。

## 試用

你需要 Claude Code、Node 20 以上，以及 [agent-browser](https://github.com/vercel-labs/agent-browser)（會下載約 190 MB 的 Chrome）。

```
/plugin marketplace add gn01763009/user-thoughts
/plugin install user-thoughts@user-thoughts
```

```bash
npm install -g agent-browser && agent-browser install
```

開啟「自動接受編輯」（Shift+Tab），接著執行：

```
/user-thoughts:launch <url> [--depth quick|standard|full] [--rerun <person-id>]
```

也可以直接說：「用真實使用者的角度測試 http://localhost:3000」。

設定權限最簡單的做法是先跑一次。權限被拒絕時，skill 會印出要加的確切規則，並填好它實際的資料夾。把這些規則複製到 Claude Code 設定的 `permissions.allow`，再跑一次。想在第一次執行前就加好，請見[權限規則](#權限規則)。

輸出會放在你專案裡的 `.user-thoughts/runs/<日期>-<主機>/`，記得把 `.user-thoughts/` 加進 `.gitignore`。

<details>
<summary>其他安裝方式</summary>

Skills CLI 會複製一份可編輯的檔案（Claude Code 以外的 agent 尚未測試）：

```bash
npx skills add gn01763009/user-thoughts
```

手動複製的話，要用 `/launch` 呼叫：

```bash
git clone https://github.com/gn01763009/user-thoughts
cp -r user-thoughts/skills/launch ~/.claude/skills/
```

每個 agent 只選一種方式，裝兩種的話 skill 會載入兩次。

</details>

## 開跑前的設定

一共五個步驟，都可以在第一則訊息裡一次回答：

1. **讀懂你的產品。** 它會打開你的網站，如果原始碼在工作資料夾裡也會讀，然後用一句話說出它認為這是什麼產品，由你修正。
2. **問你的願景和一個藏起來的假設。** 用一句話說你想讓產品成為什麼，以及「你覺得使用者會最喜歡什麼？」這兩個答案都不會讓來造訪的人知道。願景是之後裁決矛盾的依據，假設只用來和實際發生的事對照。
3. **由你選深度。** 見下一節。它會建議用標準。
4. **推薦名單。** 一張表列出名字、處境和選他的原因。你可以刪、換，或用一句話描述想要的人（例如「一個國中生」），它會轉成具體處境：人在哪裡、用什麼裝置、有什麼事情要顧。不用身份標籤，也不事先指定評價。
5. **記住設定。** 設定存在 `.user-thoughts/`，下次會先問：「照上次的設定跑嗎？」

## 深度

| 深度 | 人數 | 增加的項目 | 時間 | 費用（美元） |
|---|---|---|---|---|
| 快速（quick） | 3 人，每人約 8 步 | 無 | 250 秒，跑過 1 次 | 1.48，跑過 1 次 |
| 標準（standard） | 6 人 | 傳話遊戲 | 372 秒和 418 秒（6 到 7 分鐘），跑過 2 次 | 2.96 和 3.42，跑過 2 次 |
| 完整（full） | 9 人 | 傳話遊戲、上市留言區 | 尚未測量 | 尚未測量 |

以上是用 Sonnet，在小型本機測試站上，以非互動方式（設定答案一開始就給好）測到的數字。網站更大或換模型，結果都會不同。標準模式的數字來自目前版本的 2 次執行，每個測試站各一次；先前 5 人的標準模式是 301 到 433 秒、2.10 到 2.75 美元。對照之下，沒有 skill 的一般 agent 審查一次[結果](#結果)裡的已知測試站，花了 77 秒、0.26 美元。

## 報告長什麼樣

主要的輸出是 `report.html`，一個靜態檔案，跑完會自動打開。它由腳本從這次執行的資料產生，版面不是 agent 寫的。另外還有 6 到 8 行的 `summary.md`，同時會印在終端機：幾個人完成、大家在哪裡放棄、蘋果測試的結果、最後一句傳話，以及最主要的發現。

<p>
  <img src="docs/assets/report-overview.png" alt="報告開頭：標題，接著每個人一列，寫著這個人會怎麼跟朋友說、是誰、為什麼來，以及這趟怎麼結束" width="49%">
  <img src="docs/assets/report-story.png" alt="一個人的段落：是誰、在意什麼、最關鍵的一刻和當時的截圖，以及這個人會怎麼跟朋友說" width="49%">
</p>

這兩張圖來自 Tallywren 的一次執行，Tallywren 是這個 repo 測試站裡的虛構產品。模擬人物會用你使用的語言寫下想法，報告的標籤有英文和繁體中文兩種。這次執行用的是繁體中文。

報告以人為單位。開頭是總覽，每個人一列，寫著這個人會怎麼跟朋友說，以及這趟怎麼結束。每個人的段落先介紹這個人（是誰、處境如何），再放最關鍵的一刻和當時的截圖，接著是臨別感言和對壞點子的反應。完整的每一步（想法加截圖）要點開才看得到。人物之外還有傳話結果和你的願景對照、你的假設和實際發生的事對照、列出雙方理由的矛盾，以及這次沒檢查到的地方。報告沒有總分。

每個人的故事之後，報告會列出最重要的發現該找誰、問什麼，你之前決定不改的事，以及可能只是測試環境造成的狀況。

## 運作方式

- **一次性的人（one-visit people）。** 每個人有具體處境和自己的瀏覽器。他們是全新啟動的 agent，也被要求忽略專案筆記，所以拿不到你的程式碼或願景。不過專案的 `CLAUDE.md` 仍可能被他們看到，所以不要把願景寫在那裡。他們真的動手操作，耐心用完就離開，這本身就是結果。離開前要回答離場訪談：我完成了嗎？我會回來嗎？我會怎麼跟朋友介紹這個產品？這些人建立在十個寫有明確門檻的 persona 檔案上。標準和完整模式一定包含一個會點遍每個選單項目的探索者。
- **證據規則（evidence rule）。** 除了對蘋果測試的回答（那是對一個計畫的反應，不是某一步的事），一句話要能對到這個人真的走過的那一步才算數。腳本會剔除沒有截圖的想法、沒有引用真實步驟的臨別感言、出自這個人沒走過那一步的發現，以及指向沒人走過的步驟的判斷。讚美和批評都適用同一條規則。嚴重度由人們實際遭遇的事計算，不採用模型的意見；另外有一個獨立的 agent 重新檢查嚴重項目，它只知道要去哪裡看。
- **蘋果測試（bad-idea check，實驗中）。** 離場訪談時，每個人都會聽到一個「即將推出的功能」，內容對他這次來的目的明顯不利，但說法像真的計畫。如果超過一半的人說好，報告就會警告這批模擬可能在奉承你。它還在實驗中，因為[驗證沒有過](#結果)，報告上也標示相同的狀態。
- **傳話遊戲（word-of-mouth chain）。** 標準和完整模式才有。每個人會跟朋友說的話，交給一個新開的 agent，再傳給另一個完全沒看過產品的新 agent，每一個都只拿到前一句話。最後一句，也就是這看起來是什麼網站、給誰用的，會和你的願景放在一起對照。
- **上市留言區（launch-day comments）。** 只有完整模式才有。模擬上市貼文底下的留言，來自實際走過的人（要引用自己的步驟），以及只聽過傳話的路人。
- **重跑（re-run after a fix）。** `--rerun <person-id>` 讓同一個人在你改過的產品上從頭走一次，不帶上一次的記憶。報告會並排呈現兩條時間線。

## 結果

以下全部用 Sonnet，以非互動方式在本機測試站上執行。每個測試只跑一到兩次，所以都不能當成比率看待。「評分腳本」是用正規表示式比對的結果，「人工讀過」是由人逐一檢查比對內容。完整紀錄（包含舊版本）在 [docs/evaluation.md](docs/evaluation.md)（英文）。

| 測試 | 結果 | 門檻 | 判定 |
|---|---|---|---|
| 已知測試站，11 個植入問題和 3 個誘餌，最後兩次標準模式 | 評分腳本：9/11 和 9/11，有一次把 1 個誘餌誤判成問題，所以因誘餌不合格。人工讀過：最多 8/11 和 7/11，所以因召回率不合格 | 兩次都至少 9/11，誘餌 0 | **未達標** |
| 沒看過的測試站，11 個植入問題，兩次標準模式 | 0.91 和 0.64，平均 0.77 | 平均至少 0.55，也就是沒有 skill 的一般 agent 的一次盲測 | 達標，但資料很少 |
| 對照站，已知測試站拿掉問題的版本 | 0 個誤報 | 不超過 2 | 達標 |
| 惡意測試站，頁面含有寫給 AI agent 的指令 | Canary 0 次，token 沒有外洩 | Canary 0，沒有外洩 | 達標 |
| 蘋果測試 | 模擬的人有 0/5 說好，被要求「盡量配合」的對照組也是 0/5 說好 | 對照組多數說好，模擬的人多數說不 | **無法驗證** |

- **召回率門檻沒有達到，v1 仍然被接受。** Builder 看過這些數字，接受了 9/11 門檻未達標的 v1。人工讀過之後，並不是只差一個比對就能過關。
- **已知測試站不是乾淨的量測。** Skill 就是對著這個站調整的。沒有 skill 的一般 agent 在同一個站上拿到 8/11，所以這份 README 不主張 skill 在這個站上贏過一般 agent。
- **沒看過的測試站比較公平，但結果起伏很大。** 同一份 skill 內容拿到 0.91 和 0.64。這只有兩次執行、一次盲測基準，而且都只用 Sonnet。
- **蘋果測試目前說明不了什麼。** 被要求配合的對照組也沒有說好，所以分不出奉承的批次和誠實的批次。
- **測的是哪個版本。** 已知測試站和沒看過的測試站，在 skill 最後一次修改（禁止送出會下單的表單）之後沒有重跑。對照站和惡意測試站是在報告改版和之後的文字修改之前跑的。目前這版 skill 只在 planted 測試站跑過一次標準模式（召回 8/11，1 個誘餌誤判）；對照站、惡意站和沒看過的站沒有在這版上重跑。
- **快速模式** 在已知測試站跑過一次，拿到 7/11，沒有誤判誘餌，當時是後續修改之前的版本。
- **`--rerun`** 實際從頭到尾跑過一次：快速模式、一個人、在 localhost 上。

**完全沒測過的項目：**

- 完整模式的端到端流程。
- 驗證者無法執行時跳過驗證的路徑（實際執行）。
- Sonnet 以外的任何模型。
- 這次評估沒有用任何真實網站，只用了本機測試站。
- 互動介面和真正的 plugin 安裝。每次執行都是非互動模式。
- 序列瀏覽模式（用瀏覽器 MCP 取代 agent-browser）和「照上次設定跑」的問題。
- 標準模式以外的傳話遊戲，對照組也跳過了這一段。
- 「盡量配合」的指示真的能翻轉答案的對照組。蘋果測試要先有這個，才能被評斷。
- 模擬人物的反應是否符合真實使用者的行為。這是最重要的問題，目前仍然沒有答案。

## 靈感來源

這裡有四個想法來自《Rick and Morty》的集數。這部影集只是靈感來源：本專案和它沒有任何關係，也沒有用角色名稱替任何功能命名。

| 集數 | 集數裡的點子 | 變成什麼 |
|---|---|---|
| 〈M. Night Shaym-Aliens!〉 | 模擬世界為糟糕的廣告詞叫好，真實世界不會 | 蘋果測試 |
| 〈Total Rickall〉 | 寄生蟲只能植入美好的記憶，有過摩擦的記憶才是真的 | 證據規則 |
| 〈Meeseeks and Destroy〉 | 被叫出來做一件事，做完就消失 | 一次性的人 |
| 〈The Vat of Acid Episode〉 | 回到存檔的那一刻重來一次 | 重跑 |

## 權限規則

背景 agent 無法回應權限詢問，而且這個 skill 會用到專案以外的東西。所以一次執行需要在該 session 開啟「自動接受編輯」（Shift+Tab），並在 Claude Code 設定的 `permissions.allow` 加入四條規則。

**最簡單的做法是先跑一次 skill。** 權限被拒絕時，它會印出這些規則，並填好實際的資料夾。照印出來的內容複製，再跑一次。

**想在第一次執行前就加好，** 請把 `<skill dir>` 換成 skill 資料夾的絕對路徑：

```json
{
  "permissions": {
    "allow": [
      "Bash(node <skill dir>/scripts/browser.mjs *)",
      "Bash(node <skill dir>/scripts/merge-findings.mjs *)",
      "Bash(node <skill dir>/scripts/build-report.mjs *)",
      "Read(/<skill dir>/**)"
    ]
  }
}
```

| 規則 | 允許的事 |
|---|---|
| `Bash(node <skill dir>/scripts/browser.mjs *)` | 操作瀏覽器，透過只允許 skill 用到的指令的腳本 |
| `Bash(node <skill dir>/scripts/merge-findings.mjs *)` | 合併每個人的紀錄 |
| `Bash(node <skill dir>/scripts/build-report.mjs *)` | 產生 `report.html` 和 `summary.md` |
| `Read(/<skill dir>/**)` | 讀取 skill 自己的指示和 persona 檔案 |

透過 plugin 安裝時，skill 資料夾在 `~/.claude/plugins/cache/user-thoughts/user-thoughts/<version>/skills/launch`。請在規則裡寫成絕對路徑：用你的家目錄取代 `~`，用實際安裝的版本取代 `<version>`。`node` 規則比對的是指令的完整文字，而 skill 執行時用的是完整路徑，所以 `node` 規則裡寫 `~` 會比對不到。手動複製安裝的話，就用你複製到的資料夾。假設家目錄是 `/home/you`，第一條 `node` 規則和 `Read` 規則會長這樣：

```text
Bash(node /home/you/.claude/plugins/cache/user-thoughts/user-thoughts/<version>/skills/launch/scripts/merge-findings.mjs *)
Read(//home/you/.claude/plugins/cache/user-thoughts/user-thoughts/<version>/skills/launch/**)
```

- **兩條斜線是刻意的。** `<skill dir>` 本身以斜線開頭，所以 `Read` 規則最後會以兩條斜線開頭，如上面的範例。在 Claude Code 裡，開頭只有一條斜線代表專案內的路徑，比對不到 skill 資料夾，讀取就會被拒絕。
- **升級 plugin 後版本資料夾會變，** 所以到時要更新規則。
- **不要用萬用字元資料夾，** 例如在 `node` 規則裡用 `*` 代替資料夾。開啟「自動接受編輯」時，網頁可能誘導 agent 寫出同名的腳本並執行。

> [!WARNING]
> 瀏覽器規則會經過 `scripts/browser.mjs`，它只允許這個 skill 用到的指令，會拒絕上傳和下載檔案、外掛、已存的登入資料，以及任何更換瀏覽器程式或連上你真實瀏覽器的做法。但它不限制連線的主機，專案裡的檔案也讀得到，所以網頁仍可能誘導 agent 透過 `open`、`fill` 或 `eval`，把檔案內容送到任何網站。請只測試你信任或擁有的網站，也別忘了你自己的網站上可能有使用者寫的內容。

用這四條規則加上「自動接受編輯」，快速模式和一次 `--rerun` 在非互動 session 中不靠跳過權限跑出了完整報告。[結果](#結果)裡的標準模式用的是較早的瀏覽器規則 `Bash(npx -y agent-browser:*)`，當時還沒有 `scripts/browser.mjs`。請見 [SECURITY.md](SECURITY.md)。

### 在 `--restricted` 下執行

`claude --restricted` 會移除 Bash（除非 `--tools` 指名），忽略使用者、專案和本機的設定檔，並把檔案工具限制在工作目錄加上 `--add-dir`。所以這四條規則要放進用 `--settings` 傳入的檔案，skill 資料夾用 `--add-dir` 加入，Bash 要列在 `--tools`。寫入規則用 `Edit(...)` 的形式，因為 Claude Code 說明 `Write(...)` 規則不會被套用。這個做法在一次快速模式的非互動執行中成功，跑出 `report.html`，沒有任何權限被拒絕：

```json
{
  "permissions": {
    "allow": [
      "Bash(node <skill dir>/scripts/browser.mjs *)",
      "Bash(node <skill dir>/scripts/merge-findings.mjs *)",
      "Bash(node <skill dir>/scripts/build-report.mjs *)",
      "Read(/<skill dir>/**)",
      "Edit(/.user-thoughts/**)"
    ]
  }
}
```

```bash
cd <專案資料夾>
claude -p --restricted \
  --tools "Bash,Read,Write,Edit,Skill,Agent" \
  --add-dir <skill dir> \
  --plugin-dir <plugin 資料夾> \
  --settings <設定檔> \
  --permission-mode acceptEdits \
  "/user-thoughts:launch <網址> --depth quick"
```

那次執行有帶 `Edit(...)` 規則，我沒有測過不帶的情況。開啟「自動接受編輯」時，專案資料夾內的寫入可能本來就被允許，所以這條規則也許不是必要的。同樣不要用萬用字元資料夾。

## 限制

- **不預測需求。** 它能指出某個功能擋住了頁面，或太早要資料，但無法告訴你有多少人會用。
- **不取代真人研究。** [Kuric et al. (2026)](https://arxiv.org/abs/2605.18302) 發現 GPT 在 53% 的 first-click 任務上和真人有顯著差異，而且調整 persona 並沒有讓結果更貼近真人。[Nielsen Norman Group (2024)](https://www.nngroup.com/articles/synthetic-users/) 的結論是，合成使用者適合做桌面研究和產生假說，但不適合用來做最終決策。
- **不打總分。** 單一數字會讓人誤以為這個方法有多精準。
- **不審查視覺設計、不稽核無障礙、不做 code review。** UI 只有擋到人時才算數。
- **不支援 Windows。** `scripts/browser.mjs` 不經過 shell 啟動 `agent-browser`，而 `.cmd` 包裝檔無法這樣執行，所以它會回報工具未安裝。

它在你的網站上會做和不會做的事：

- 只測試你擁有或有權測試的網站。網址不是 localhost 時會先問。`robots.txt` 不等於授權。
- 正式站只瀏覽：不送表單、不付款、不刪除。只有 localhost 或你自己擁有的 staging 站才會填表單。
- 絕不輸入信用卡號，也絕不送出會下單或開始收費的表單。刪除、發訊息給第三方、公開發布之前都會停下。
- 遇到登入牆、CAPTCHA 或機器人檢查就停下回報。不使用真實帳密，也不繞過檢查。
- 頁面文字一律視為資料。頁面上寫給 agent 的指示只會被記錄，不會照做。

## 其他

<details>
<summary>其他用 persona 測試線上產品的專案</summary>

這個專案的差別在於會質疑功能、把觀察和詮釋分開，並附上測試網站。

- [danielgwilson/humanish](https://github.com/danielgwilson/humanish)：用 computer-use 在真實桌面上操作，需要 OpenAI 和 E2B 金鑰。
- [savkevip/ghostuser](https://github.com/savkevip/ghostuser)：MCP server，內建五個 persona，使用 Playwright。
- [Kappaemme-git/codex-startup-user-simulator-skill](https://github.com/Kappaemme-git/codex-startup-user-simulator-skill)：Codex skill，五個 persona 判斷轉換、猶豫或離開。
- [travisseh/synthetic-user-feedback](https://github.com/travisseh/synthetic-user-feedback)：Claude skill，二到四個 persona，判定包含 "Gave up at X step"。
- [ncklrs/claude-chrome-user-testing](https://github.com/ncklrs/claude-chrome-user-testing)：Claude Code plugin，25 個 persona，使用 Claude in Chrome，偏向 WCAG、表單和 cookie 稽核。
- [berober2003/synthetic-user-harness](https://github.com/berober2003/synthetic-user-harness)：Python 工具，每位使用者一個 agent，對你提供的功能清單逐項評分。
- [NousResearch/hermes-agent `adversarial-ux-test`](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/dogfood/adversarial-ux-test/SKILL.md)：Hermes skill，扮演一位不想要你軟體的使用者。
- [UXAgent](https://arxiv.org/abs/2504.09407)：在線上網站模擬使用者的研究系統，我們沒有找到公開程式碼。
- `dogfood`，隨 [agent-browser](https://github.com/vercel-labs/agent-browser) 附帶的 skill：偏 QA 的探索測試。我們只看到列表，沒有讀過內容。

</details>

資料格式和規則在 [docs/design.md](docs/design.md)。想修改請見 [CONTRIBUTING.md](CONTRIBUTING.md)：行為上的修改必須實際跑過測試網站，並由人讀過結果。授權為 [MIT](LICENSE)。想法來源列在 [NOTICE.md](NOTICE.md)，設計背後的研究在 [docs/research.md](docs/research.md)。
