// web/src/components/DocsModal.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
import typescript from 'highlight.js/lib/languages/typescript';
import { DOCS, DOC_CATEGORIES, type DocEntry } from '../docs/registry';
import 'highlight.js/styles/github.css';

// Регистрируем только нужные языки
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('typescript', typescript);

// Настраиваем marked с подсветкой через highlight.js
marked.use(markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch { }
        }
        return code;
    },
}));

marked.setOptions({ gfm: true, breaks: false });

interface Props {
    onClose: () => void;
    initialDocId?: string;
}

export function DocsModal({ onClose, initialDocId }: Props) {
    const [activeDocId, setActiveDocId] = useState<string>(
        initialDocId ?? DOCS[0]!.id,
    );
    const [query, setQuery] = useState('');
    const [toc, setToc] = useState<Array<{ level: number; id: string; text: string }>>([]);
    const contentRef = useRef<HTMLDivElement>(null);

    const activeDoc = useMemo(
        () => DOCS.find(d => d.id === activeDocId) ?? DOCS[0]!,
        [activeDocId],
    );

    // Фильтрация списка документов
    const filteredDocs = useMemo(() => {
        if (!query.trim()) return DOCS;
        const q = query.toLowerCase();
        return DOCS.filter(
            d =>
                d.title.toLowerCase().includes(q) ||
                d.description.toLowerCase().includes(q) ||
                d.content.toLowerCase().includes(q),
        );
    }, [query]);

    // Рендер MD → HTML
    const renderedHtml = useMemo(() => {
        const html = marked.parse(activeDoc.content) as string;
        return html;
    }, [activeDoc]);

    // Извлекаем TOC и переписываем ссылки
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        // Проходим по всем h2/h3 и собираем TOC
        const headings = container.querySelectorAll('h2, h3');
        const tocEntries: typeof toc = [];
        const usedIds = new Set<string>();

        headings.forEach(h => {
            const text = h.textContent ?? '';
            let id = slugify(text);
            // Гарантируем уникальность
            let baseId = id;
            let counter = 2;
            while (usedIds.has(id)) {
                id = `${baseId}-${counter++}`;
            }
            usedIds.add(id);
            h.id = id;
            tocEntries.push({
                level: h.tagName === 'H2' ? 2 : 3,
                id,
                text,
            });
        });

        setToc(tocEntries);

        // Переписываем ссылки
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;

            // Внутренняя ссылка на другой MD
            const mdMatch = /\.md(#.*)?$/.exec(href);
            if (mdMatch) {
                const anchor = mdMatch[1] ?? '';
                // Пытаемся найти документ по имени файла
                const fileName = href.replace(/\.md.*$/, '').toLowerCase();
                const targetDoc = findDocByFileName(fileName);
                if (targetDoc) {
                    link.onclick = e => {
                        e.preventDefault();
                        setActiveDocId(targetDoc.id);
                    };
                    return;
                }
            }

            // Внутренний anchor в текущем документе
            if (href.startsWith('#')) {
                link.onclick = e => {
                    e.preventDefault();
                    const target = container.querySelector(href);
                    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                };
                return;
            }

            // Внешняя ссылка — открываем в новой вкладке
            if (/^https?:\/\//.test(href)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }, [renderedHtml]);

    // Скролл вверх при смене документа
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [activeDocId]);

    // Закрытие по Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const onTocClick = (id: string) => {
        const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="docs-backdrop" onClick={onClose}>
            <div className="docs-modal" onClick={e => e.stopPropagation()}>
                {/* Шапка */}
                <div className="docs-header">
                    <div className="docs-title">
                        <span className="docs-title-icon">📚</span>
                        Документация
                    </div>
                    <div className="docs-actions">
                        <a
                            className="icon-btn"
                            href={activeDocGithubUrl(activeDoc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Открыть в новой вкладке"
                        >
                            ↗
                        </a>
                        <button className="icon-btn" onClick={onClose} title="Закрыть (Esc)">
                            ×
                        </button>
                    </div>
                </div>

                {/* Тело: три колонки */}
                <div className="docs-body">
                    {/* Левая панель — список */}
                    <aside className="docs-sidebar">
                        <input
                            className="docs-search"
                            placeholder="Поиск по документации…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />

                        <div className="docs-list">
                            {(Object.keys(DOC_CATEGORIES) as DocEntry['category'][]).map(cat => {
                                const items = filteredDocs.filter(d => d.category === cat);
                                if (items.length === 0) return null;

                                return (
                                    <div key={cat}>
                                        <div className="docs-category">
                                            {DOC_CATEGORIES[cat]}
                                        </div>
                                        {items.map(d => (
                                            <button
                                                key={d.id}
                                                className={`docs-item ${d.id === activeDocId ? 'active' : ''}`}
                                                onClick={() => setActiveDocId(d.id)}
                                            >
                                                <div className="docs-item-title">{d.title}</div>
                                                <div className="docs-item-desc">{d.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}

                            {filteredDocs.length === 0 && (
                                <div className="docs-empty">Ничего не найдено</div>
                            )}
                        </div>
                    </aside>

                    {/* Центр — содержимое MD */}
                    <main className="docs-content" ref={contentRef}>
                        <div
                            className="markdown-body"
                            dangerouslySetInnerHTML={{ __html: renderedHtml }}
                        />
                    </main>

                    {/* Правая панель — TOC (только для широких экранов) */}
                    {toc.length > 2 && (
                        <aside className="docs-toc">
                            <div className="docs-toc-title">Содержание</div>
                            {toc.map((entry, i) => (
                                <button
                                    key={i}
                                    className={`docs-toc-item docs-toc-level-${entry.level}`}
                                    onClick={() => onTocClick(entry.id)}
                                    title={entry.text}
                                >
                                    {entry.text}
                                </button>
                            ))}
                        </aside>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Утилиты
// ============================================================

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\wа-яё\s-]/gi, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function findDocByFileName(name: string): DocEntry | undefined {
    // DSL.md → dsl, USER_GUIDE.md → user-guide
    const id = name.replace(/_/g, '-');
    return DOCS.find(d => d.id === id);
}

function activeDocGithubUrl(docId: string): string {
    // Открывает в новом окне raw-файл на GitHub
    // Замени на свой репозиторий
    const fileMap: Record<string, string> = {
        'user-guide': 'USER_GUIDE.md',
        dsl: 'DSL.md',
        cli: 'CLI.md',
        architecture: 'ARCHITECTURE.md',
        examples: 'EXAMPLES.md',
        snippets: 'SNIPPETS.md',
    };
    const file = fileMap[docId] ?? 'README.md';
    return `https://github.com/your-org/domain-schema-builder/blob/main/docs/${file}`;
}