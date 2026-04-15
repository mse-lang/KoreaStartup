#!/usr/bin/env python3
"""WP 임시글 → Gemini 리라이팅 → WP 업데이트"""
import requests
import re
import json
import time
import sys

GEMINI_API_KEY = "AIzaSyBPMB3cqXYKgLJ4Yy-zgE4-qWV_gikbvo8"
WP_BASE = "https://www.venturesquare.net"
COOKIE = "wordpress_logged_in_e3fb453ca3f5ea0045d0c92646311bed=mse0130%7C1776000859%7CKJTB19If3YReoNyYezp5CQAPkoMYv9oSmuO6KxcT5Yz%7C5c9dced040c44208e0e352497baf9abcbe006495a52486bd3af91b40aaf27730; wordpress_sec_e3fb453ca3f5ea0045d0c92646311bed=mse0130%7C1776000859%7CKJTB19If3YReoNyYezp5CQAPkoMYv9oSmuO6KxcT5Yz%7C5d9dc2dd02b8e4f05fa9842f6f67542373a7ef7684f34fd13f65250e88fd45fe; PHPSESSID=1itv8tjml7p3jvmt7e0r3lbvl1; wfwaf-authcookie-64242899701f7e3611a851482a7d79c7=3011%7Cadministrator%7Cmanage_options%2Cunfiltered_html%2Cedit_others_posts%2Cupload_files%2Cpublish_posts%2Cedit_posts%2Cread%7C90d759ccabbe98fecdccd6e25391b8b7364200b99b6c171c020f6088f2b1128f"

HEADERS = {"Cookie": COOKIE, "User-Agent": "Mozilla/5.0"}

REWRITE_PROMPT_TEMPLATE = """당신은 벤처스퀘어(venturesquare.net)의 전문 테크/스타트업 기자입니다.
아래 보도자료를 벤처스퀘어 기사 스타일로 전면 리라이팅하세요.

[리라이팅 원칙]
1. 역삼각형 구조: 핵심 사실(육하원칙) → 세부 내용 → 배경/의의
2. 홍보성 문구 제거: "업계 최고", "혁신적인", "선도적" 등 수식어 삭제
3. 기업 관계자 발언은 직접 인용(따옴표) 형식으로 처리
4. 수치, 날짜, 기업명 등 팩트는 반드시 유지
5. 첫 문장에 핵심 내용 압축 (50자 이내)
6. 전체 분량: 400~600자 (HTML 태그 제외)
7. HTML 형식으로 출력: <p> 태그 사용, 소제목은 <strong> 사용
8. 제목도 새로 작성 (클릭을 유도하되 낚시성 제목 금지)

반드시 아래 JSON 형식으로만 출력하세요 (다른 텍스트 없이):
{"title": "새 제목", "content": "<p>본문 HTML</p>"}

[원본 제목]
ORIG_TITLE

[원본 내용]
ORIG_CONTENT"""

def strip_html(html):
    html = re.sub(r'<[^>]+>', ' ', html)
    html = re.sub(r'&nbsp;', ' ', html)
    html = re.sub(r'&amp;', '&', html)
    html = re.sub(r'&lt;', '<', html)
    html = re.sub(r'&gt;', '>', html)
    html = re.sub(r'&#\d+;', '', html)
    html = re.sub(r'\s+', ' ', html)
    return html.strip()

def get_post_content(post_id):
    """WP 편집 페이지에서 제목+내용 추출"""
    res = requests.get(
        f"{WP_BASE}/wp-admin/post.php?post={post_id}&action=edit",
        headers=HEADERS, timeout=15
    )
    html = res.text
    
    # 제목
    title_m = re.search(r'id="title"[^>]*value="([^"]*)"', html)
    if not title_m:
        title_m = re.search(r'name="post_title"[^>]*value="([^"]*)"', html)
    title = title_m.group(1) if title_m else ''
    title = title.replace('&#8220;', '"').replace('&#8221;', '"').replace('&#8216;', "'").replace('&#8217;', "'")
    
    # 내용 (textarea)
    content_m = re.search(r'<textarea[^>]+id="content"[^>]*>(.*?)</textarea>', html, re.DOTALL)
    content = content_m.group(1) if content_m else ''
    
    # nonce
    nonce_m = re.search(r'name="_wpnonce" value="([^"]+)"', html)
    nonce = nonce_m.group(1) if nonce_m else ''
    
    # post_ID hidden field
    post_id_m = re.search(r'name="post_ID" value="(\d+)"', html)
    
    return title, content, nonce

def gemini_rewrite(title, content):
    """Gemini로 리라이팅"""
    plain_content = strip_html(content)[:3000]
    prompt = REWRITE_PROMPT_TEMPLATE.replace("ORIG_TITLE", title).replace("ORIG_CONTENT", plain_content)
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key={GEMINI_API_KEY}"
    res = requests.post(url, json={
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 1500, "temperature": 0.4}
    }, timeout=30)
    
    if res.status_code != 200:
        return None, None
    
    text = res.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    
    # JSON 파싱
    json_m = re.search(r'\{.*\}', text, re.DOTALL)
    if json_m:
        try:
            data = json.loads(json_m.group(0))
            return data.get("title", ""), data.get("content", "")
        except:
            pass
    return None, None

def update_post(post_id, new_title, new_content, nonce):
    """WP 편집 폼으로 내용 업데이트"""
    data = {
        "post_ID": str(post_id),
        "post_title": new_title,
        "content": new_content,
        "post_status": "draft",
        "action": "editpost",
        "_wpnonce": nonce,
        "save": "임시글로 저장",
    }
    res = requests.post(
        f"{WP_BASE}/wp-admin/post.php",
        headers={**HEADERS, "Content-Type": "application/x-www-form-urlencoded"},
        data=data,
        allow_redirects=True,
        timeout=15
    )
    return res.status_code in (200, 302)

def main():
    with open('/tmp/draft_ids.txt') as f:
        ids = [line.strip() for line in f if line.strip()]
    
    print(f"\n🚀 총 {len(ids)}개 임시글 리라이팅 시작\n")
    
    done = 0
    failed = 0
    results = []
    
    for post_id in ids:
        print(f"[{done+1}/{len(ids)}] ID:{post_id} 처리 중...", end=' ', flush=True)
        
        # 내용 가져오기
        title, content, nonce = get_post_content(post_id)
        if not title or not nonce:
            print("❌ 내용 로드 실패")
            failed += 1
            continue
        
        print(f"'{title[:35]}...'", end=' ', flush=True)
        
        # Gemini 리라이팅
        new_title, new_content = gemini_rewrite(title, content)
        if not new_title or not new_content:
            print("❌ Gemini 실패")
            failed += 1
            time.sleep(2)
            continue
        
        # WP 업데이트
        ok = update_post(post_id, new_title, new_content, nonce)
        if ok:
            print(f"✅ → '{new_title[:35]}'")
            results.append({"id": post_id, "old": title, "new": new_title})
            done += 1
        else:
            print("❌ 업데이트 실패")
            failed += 1
        
        time.sleep(1.5)  # rate limit
    
    print(f"\n✨ 완료! 성공 {done}개 / 실패 {failed}개\n")
    
    # 결과 저장
    with open('/tmp/rewrite_results.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    main()
