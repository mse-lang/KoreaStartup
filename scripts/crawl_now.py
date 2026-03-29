#!/usr/bin/env python3
"""KoreaStartup RSS 크롤러 - 직접 실행용"""
import feedparser
import requests
import json
import re
from datetime import datetime, timezone
import time
import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://egpfuoyhmsanmfcfsmre.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

CATEGORIES = [
    {"name": "special-post",   "feed": "https://www.venturesquare.net/category/special-post/feed/",   "source": "벤처스퀘어",   "max": 4},
    {"name": "interview-news", "feed": "https://www.venturesquare.net/category/interview-news/feed/", "source": "벤처스퀘어",   "max": 3},
    {"name": "startup-topic",  "feed": "https://www.venturesquare.net/startup-topic/feed/",           "source": "벤처스퀘어",   "max": 3},
    {"name": "etnews-startup", "feed": "https://rss.etnews.com/Section901.xml",                       "source": "전자신문",     "max": 5},
    {"name": "hankyung-it",    "feed": "https://rss.hankyung.com/new/news_it.xml",                    "source": "한국경제",     "max": 5},
    {"name": "mk-it",          "feed": "https://www.mk.co.kr/rss/50300009/",                          "source": "매일경제",     "max": 5},
    {"name": "fnnews-it",      "feed": "https://www.fnnews.com/rss/new/fn_realnews_it.xml",           "source": "파이낸셜뉴스", "max": 5},
    {"name": "eo-planet",      "feed": "https://eopla.net/feed",                                      "source": "EO",          "max": 5},
    {"name": "itdonga",        "feed": "https://it.donga.com/feeds/rss/",                             "source": "IT동아",      "max": 3},
    {"name": "geeknews",       "feed": "https://news.hada.io/rss/news",                               "source": "GeekNews",    "max": 3},

]

def strip_html(text):
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def generate_slug(title):
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')[:120]
    return slug

def gemini_summary(title, excerpt):
    """Gemini로 5줄 요약"""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
        prompt = f"""스타트업 뉴스 큐레이터로서 아래 기사를 한국어 5줄 요약해주세요.
각 줄은 핵심 정보(숫자, 기업명, 기술명 포함)를 간결하게.
형식: 1. ~ 2. ~ 3. ~ 4. ~ 5. ~

제목: {title}
내용: {excerpt[:1000]}"""
        
        res = requests.post(url, json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": 300}
        }, timeout=15)
        
        if res.status_code == 200:
            return res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print(f"  Gemini 오류: {e}")
    return f"1. {title}"

def url_exists(url):
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/articles?source_url=eq.{requests.utils.quote(url)}&select=id&limit=1",
        headers=HEADERS
    )
    return len(res.json()) > 0

def insert_article(article):
    res = requests.post(
        f"{SUPABASE_URL}/rest/v1/articles",
        headers=HEADERS,
        json=article
    )
    return res.status_code in (200, 201)

def main():
    total_new = 0
    total_skip = 0
    
    print(f"\n🚀 KoreaStartup 크롤링 시작 ({datetime.now().strftime('%Y-%m-%d %H:%M:%S')})\n")
    
    for cat in CATEGORIES:
        print(f"📡 [{cat['source']}] {cat['name']} 크롤 중...")
        try:
            feed = feedparser.parse(cat["feed"])
            items = feed.entries[:cat["max"]]
            
            for item in items:
                title = (item.get("title") or "").strip()
                url = (item.get("link") or "").strip()
                if not title or not url:
                    continue
                
                # 중복 체크
                if url_exists(url):
                    print(f"  ⏭️  중복: {title[:50]}")
                    total_skip += 1
                    continue
                
                # 내용 추출
                excerpt = strip_html(
                    item.get("summary") or 
                    item.get("content", [{}])[0].get("value", "") or ""
                )[:500]
                
                # 이미지 추출
                og_image = None
                if hasattr(item, "media_content") and item.media_content:
                    og_image = item.media_content[0].get("url")
                if not og_image:
                    img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', 
                                          item.get("content", [{}])[0].get("value", "") if item.get("content") else "")
                    if img_match:
                        og_image = img_match.group(1)
                
                # 날짜
                pub_date = None
                if item.get("published_parsed"):
                    pub_date = datetime(*item.published_parsed[:6], tzinfo=timezone.utc).isoformat()
                else:
                    pub_date = datetime.now(timezone.utc).isoformat()
                
                # AI 요약
                summary = gemini_summary(title, excerpt)
                time.sleep(0.5)  # rate limit
                
                # DB 삽입
                article = {
                    "title": title,
                    "slug": generate_slug(title),
                    "source_name": cat["source"],
                    "source_url": url,
                    "content_raw": excerpt,
                    "summary_5lines": summary,
                    "excerpt": excerpt or None,
                    "og_image_url": og_image,
                    "category": cat["name"],
                    "published_at": pub_date,
                    "author_name": None,
                }
                
                if insert_article(article):
                    print(f"  ✅ 등록: {title[:60]}")
                    total_new += 1
                else:
                    print(f"  ❌ 실패: {title[:60]}")
        
        except Exception as e:
            print(f"  ❌ 피드 오류: {e}")
        
        time.sleep(1)
    
    print(f"\n✨ 완료! 신규 {total_new}개 등록 / {total_skip}개 중복 스킵\n")

if __name__ == "__main__":
    main()
