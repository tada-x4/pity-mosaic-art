const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const output = document.getElementById("output");
const outputContainer = document.getElementById("outputContainer");
const status = document.getElementById("status");
const copyBtn = document.getElementById("copyBtn");
const copyBtnText = document.getElementById("copyBtnText");
const imgInput = document.getElementById("imgInput");
const MAX_CHARS = 3000;
let emojis = [];

// ファイルドロップ対応
const uploadLabel = document.querySelector(".upload-label");

["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
  uploadLabel.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach(eventName => {
  uploadLabel.addEventListener(eventName, () => {
    uploadLabel.style.borderColor = "#667eea";
    uploadLabel.style.background = "rgba(102, 126, 234, 0.15)";
  }, false);
});

["dragleave", "drop"].forEach(eventName => {
  uploadLabel.addEventListener(eventName, () => {
    uploadLabel.style.borderColor = "rgba(102, 126, 234, 0.5)";
    uploadLabel.style.background = "rgba(102, 126, 234, 0.05)";
  }, false);
});

uploadLabel.addEventListener("drop", (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    imgInput.files = files;
    updateFileName();
  }
}, false);

imgInput.addEventListener("change", updateFileName);

function updateFileName() {
  const fileName = imgInput.files[0]?.name;
  if (fileName) {
    document.querySelector(".upload-text").textContent = fileName;
    document.querySelector(".upload-subtext").textContent = "✓ ファイルを選択しました";
  }
}

// コピーボタンのイベントリスナー
copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(output.value);
    copyBtnText.textContent = "コピーしました！";
    copyBtn.classList.add("copied");
    
    setTimeout(() => {
      copyBtnText.textContent = "コピー";
      copyBtn.classList.remove("copied");
    }, 2000);
  } catch (err) {
    alert("コピーに失敗しました");
  }
});

// 絵文字データの読み込み
async function loadEmojis() {
  status.textContent = "🔄 絵文字データを読み込み中...";
  try {
    const res = await fetch("emojis.json");
    emojis = await res.json();
    status.textContent = `✅ 絵文字データ ${emojis.length}件 読み込み完了`;
  } catch (e) {
    status.textContent = "❌ emojis.json が見つかりません";
  }
}

// 色の距離を計算
function colorDist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

// 最適なサイズを計算（3000文字ギリギリを狙う）
function calculateOptimalSize(imgWidth, imgHeight) {
  // 絵文字名の実際の平均文字数を計算
  const avgEmojiLen = emojis.reduce((sum, e) => sum + e.name.length, 0) / emojis.length;
  
  // 3000文字に収まる最大のサイズを二分探索で見つける
  let minCols = 5;
  let maxCols = 100;
  let bestCols = minCols;
  let bestRows = Math.floor(imgHeight / (imgWidth / bestCols));
  
  while (minCols <= maxCols) {
    const cols = Math.floor((minCols + maxCols) / 2);
    const rows = Math.floor(imgHeight / (imgWidth / cols));
    const estimatedChars = (cols * avgEmojiLen + 1) * rows; // +1 は改行文字
    
    if (estimatedChars <= MAX_CHARS - 100) { // 100文字のマージンを持たせる
      bestCols = cols;
      bestRows = rows;
      minCols = cols + 1;
    } else {
      maxCols = cols - 1;
    }
  }
  
  const estimatedChars = (bestCols * avgEmojiLen + 1) * bestRows;
  return { cols: bestCols, rows: bestRows, estimatedChars: Math.floor(estimatedChars) };
}

// 生成ボタンのイベントリスナー
document.getElementById("generate").addEventListener("click", async () => {
  const imgFile = imgInput.files[0];
  if (!imgFile) {
    alert("画像を選択してください");
    return;
  }
  if (emojis.length === 0) {
    alert("絵文字データが読み込まれていません");
    return;
  }

  status.textContent = "🖼️ 画像を読み込み中...";
  const img = await new Promise(res => {
    const i = new Image();
    i.onload = () => res(i);
    i.src = URL.createObjectURL(imgFile);
  });

  // 3000文字ギリギリになるよう自動計算
  const { cols, rows, estimatedChars } = calculateOptimalSize(img.width, img.height);

  status.textContent = `⚙️ 生成中... (${cols}×${rows} 推定: ~${estimatedChars}文字)`;
  
  // キャンバスに描画
  canvas.width = cols;
  canvas.height = rows;
  canvas.style.display = "block";
  ctx.drawImage(img, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;

  // モザイク生成
  let text = "";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = (y * cols + x) * 4;
      const rgb = [data[idx], data[idx + 1], data[idx + 2]];
      
      // 最も近い色の絵文字を探す
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < emojis.length; i++) {
        const d = colorDist(rgb, emojis[i].color);
        if (d < bestDist) {
          best = i;
          bestDist = d;
        }
      }
      text += emojis[best].name;
    }
    text += "\n";
  }

  output.value = text;
  outputContainer.style.display = "block";
  status.textContent = `✅ 完了！ 出力文字数: ${text.length} / 3000`;
  
  // 文字数が制限を超えている場合は警告
  if (text.length > MAX_CHARS) {
    status.textContent += " ⚠️ 制限を超えました";
  } else if (text.length > MAX_CHARS - 200) {
    status.textContent += " 🎯";
  }
});

// 初期化
loadEmojis();