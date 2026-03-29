#!/usr/bin/env python3
"""썸네일 없는 기사에 이미지 채우기"""
import requests
import re
from urllib.parse import urlparse

import os
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://egpfuoyhmsanmfcfsmre.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def fetch_page_image(url):
    try:
        res = requests.get(url, timeout=8, headers={
            "User-Agent": "Mozilla/5.0 (compatible; KoreaStartupBot/1.0)"
        })
        if res.status_code != 200:
            return None
        html = res.text
        # og:image 우선
        og = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html)
        if og:
            return og.group(1)
        og2 = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html)
        if og2:
            return og2.group(1)
        # 첫 번째 img
        img = re.search(r'<img[^>]+src=["\']([^"\']+\.(?:jpg|jpeg|png|webp))["\']', html, re.IGNORECASE)
        if img:
            src = img.group(1)
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                parsed = urlparse(url)
                src = f"{parsed.scheme}://{parsed.netloc}{src}"
            return src
    except Exception as e:
        print(f"  ⚠️  오류: {e}")
    return None

def main():
    # 썸네일 없는 기사 조회
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/articles?og_image_url=is.null&select=id,title,source_url&limit=200",
        headers=HEADERS
    )
    articles = res.json()
    print(f"\n🔍 썸네일 없는 기사: {len(articles)}개\n")

    fixed = 0
    failed = 0

    for a in articles:
        url = a.get("source_url")
        if not url:
            failed += 1
            continue

        print(f"🔎 {a['title'][:55]}...")
        image = fetch_page_image(url)

        if image:
            patch = requests.patch(
                f"{SUPABASE_URL}/rest/v1/articles?id=eq.{a['id']}",
                headers=HEADERS,
                json={"og_image_url": image}
            )
            if patch.status_code in (200, 204):
                print(f"  ✅ {image[:70]}")
                fixed += 1
            else:
                print(f"  ❌ DB 업데이트 실패")
                failed += 1
        else:
            print(f"  ⚠️  이미지 없음")
            failed += 1

    print(f"\n✨ 완료! 성공 {fixed}개 / 실패 {failed}개\n")

if __name__ == "__main__":
    main()
