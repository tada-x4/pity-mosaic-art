import os
import time
import requests
from pathlib import Path

# ===== 設定 =====
MISSKEY_SERVER = "https://voskey.icalo.net"  # MisskeyサーバURL
SAVE_DIR = Path("emoji_images")        # 保存先フォルダ
KEYWORDS = ["pity"]      # 絵文字名に含まれるキーワード（小文字）
SLEEP_SEC = 1                        # ダウンロード間隔（秒）
# =================

def download_emojis(server=MISSKEY_SERVER, save_dir=SAVE_DIR, keywords=KEYWORDS):
    save_dir.mkdir(exist_ok=True)

    print(f"📡 {server} から絵文字一覧を取得中...")
    try:
        res = requests.get(f"{server}/api/emojis", timeout=15)
        res.raise_for_status()
        data = res.json()
    except Exception as e:
        print(f"❌ API取得エラー: {e}")
        return

    # 新形式（emojis配列）対応
    emojis = data.get("emojis", [])
    print(f"🔢 総件数: {len(emojis)}")

    # フィルタリング
    filtered = [
        e for e in emojis
        if any(k in e.get("name", "").lower() for k in keywords)
    ]
    print(f"🎯 {len(filtered)} 件がキーワード {keywords} に一致しました。\n")

    for i, e in enumerate(filtered, start=1):
        name = e.get("name")
        url = e.get("url")
        if not (name and url):
            continue

        ext = os.path.splitext(url)[1] or ".webp"
        filename = save_dir / f"{name}{ext}"

        if filename.exists():
            print(f"[{i}/{len(filtered)}] ⏩ スキップ: {filename.name}")
            continue

        print(f"[{i}/{len(filtered)}] ⬇️ ダウンロード中: {name}")
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 200:
                with open(filename, "wb") as f:
                    f.write(r.content)
                print(f"✅ 保存完了: {filename.name}")
            else:
                print(f"⚠️ 失敗({r.status_code}): {url}")
        except Exception as ex:
            print(f"❌ エラー: {name} - {ex}")

        # サーバ負荷軽減
        time.sleep(SLEEP_SEC)

    print("\n🏁 完了！")

if __name__ == "__main__":
    download_emojis()
