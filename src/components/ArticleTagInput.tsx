'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ArticleTagInputProps {
  articleId: string
  existingTags: { id: string; name: string; slug: string }[]
}

export default function ArticleTagInput({ articleId, existingTags }: ArticleTagInputProps) {
  const [tags, setTags] = useState(existingTags)
  const [input, setInput] = useState('')
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; slug: string }[]>([])
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showInput])

  // Search for existing tags as user types
  useEffect(() => {
    if (input.trim().length < 1) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('tags')
        .select('id, name, slug')
        .ilike('name', `%${input.trim()}%`)
        .limit(8)
      
      // Filter out already-attached tags
      const existingIds = new Set(tags.map(t => t.id))
      setSuggestions((data || []).filter(t => !existingIds.has(t.id)))
    }, 300)
    return () => clearTimeout(timer)
  }, [input, tags])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 60)
  }

  const addTag = async (tag: { id: string; name: string; slug: string }) => {
    setLoading(true)
    try {
      // Link tag to article
      await supabase
        .from('article_tags')
        .upsert({ article_id: articleId, tag_id: tag.id }, { onConflict: 'article_id,tag_id' })
      
      // Update tag article_count
      const { count } = await supabase
        .from('article_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', tag.id)
      await supabase.from('tags').update({ article_count: count ?? 0 }).eq('id', tag.id)

      setTags(prev => [...prev, tag])
      setInput('')
      setSuggestions([])
    } catch (e) {
      console.error('Tag add error:', e)
    }
    setLoading(false)
  }

  const createAndAddTag = async (name: string) => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const slug = generateSlug(name.trim())
      // Upsert tag
      const { data: tagData } = await supabase
        .from('tags')
        .upsert({ name: name.trim(), slug, description: '' }, { onConflict: 'slug' })
        .select('id, name, slug')
        .single()
      
      if (tagData) {
        await addTag(tagData)
      }
    } catch (e) {
      console.error('Tag create error:', e)
    }
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault()
      // If there's a matching suggestion, use it; otherwise create new
      if (suggestions.length > 0) {
        addTag(suggestions[0])
      } else {
        createAndAddTag(input)
      }
    }
    if (e.key === 'Escape') {
      setShowInput(false)
      setInput('')
      setSuggestions([])
    }
  }

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {/* Existing tags */}
      {tags.map(t => (
        <a
          key={t.id}
          href={`/tag/${t.slug}`}
          className="px-3 py-1 rounded-full text-xs font-medium bg-brand-primary/20 text-brand-primary hover:bg-brand-primary/30 transition-colors"
        >
          #{t.name}
        </a>
      ))}

      {/* Add tag button / input */}
      {showInput ? (
        <div className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => {
                if (!input.trim()) {
                  setShowInput(false)
                  setSuggestions([])
                }
              }, 200)
            }}
            placeholder="태그 입력..."
            disabled={loading}
            className="px-3 py-1 rounded-full text-xs bg-white/10 border border-white/20 outline-none focus:ring-1 focus:ring-brand-primary text-white placeholder:text-slate-500 w-32"
          />
          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px] max-h-48 overflow-y-auto">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => addTag(s)}
                  className="block w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  #{s.name}
                </button>
              ))}
              {input.trim() && !suggestions.find(s => s.name.toLowerCase() === input.trim().toLowerCase()) && (
                <button
                  onClick={() => createAndAddTag(input)}
                  className="block w-full text-left px-3 py-2 text-xs text-brand-primary hover:bg-brand-primary/10 transition-colors border-t border-white/5"
                >
                  + "{input.trim()}" 새 태그 만들기
                </button>
              )}
            </div>
          )}
          {input.trim() && suggestions.length === 0 && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 min-w-[160px]">
              <button
                onClick={() => createAndAddTag(input)}
                className="block w-full text-left px-3 py-2 text-xs text-brand-primary hover:bg-brand-primary/10 transition-colors"
              >
                + "{input.trim()}" 새 태그 만들기
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="px-2.5 py-1 rounded-full text-xs text-slate-500 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors border border-dashed border-white/10 hover:border-brand-primary/30"
        >
          + 태그 추가
        </button>
      )}
    </div>
  )
}
