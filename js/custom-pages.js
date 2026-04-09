(() => {
  const DATA_ELEMENT_ID = 'custom-page-post-data'

  const escapeHtml = value => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

  const escapeRegExp = value => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const highlightText = (value, query) => {
    const safeValue = escapeHtml(value)
    const keyword = String(query || '').trim()
    if (!keyword) return safeValue

    const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'ig')
    return safeValue.replace(pattern, '<mark>$1</mark>')
  }

  const buildMeta = post => {
    const categories = Array.isArray(post.categories) ? post.categories : []
    const categoryText = categories.map(item => item.name).join(' / ')
    return categoryText ? `${post.date} · ${categoryText}` : post.date
  }

  const buildTaxonomyHtml = (items, kind) => {
    if (!Array.isArray(items) || !items.length) return ''

    const className = kind === 'category' ? 'custom-taxonomy category' : 'custom-taxonomy'
    return items.map(item => {
      const label = escapeHtml(item.name)
      const url = escapeHtml(item.url)
      return `<a class="${className}" href="${url}">${label}</a>`
    }).join('')
  }

  const createPostCard = (post, query = '') => `
    <article class="custom-post-card">
      <div class="custom-post-card__body">
        <div class="custom-post-card__meta">${escapeHtml(buildMeta(post))}</div>
        <h2 class="custom-post-card__title">
          <a href="${escapeHtml(post.url)}">${highlightText(post.title, query)}</a>
        </h2>
        <p class="custom-post-card__excerpt">${highlightText(post.excerpt || '这篇文章暂时还没有摘要。', query)}</p>
      </div>
      <div class="custom-post-card__footer">
        <div class="custom-taxonomy-group">
          ${buildTaxonomyHtml(post.categories, 'category')}
          ${buildTaxonomyHtml(post.tags, 'tag')}
        </div>
        <a class="custom-post-card__link" href="${escapeHtml(post.url)}">阅读全文</a>
      </div>
    </article>
  `

  const getPostData = () => {
    const dataElement = document.getElementById(DATA_ELEMENT_ID)
    if (!dataElement) return []

    try {
      const parsed = JSON.parse(dataElement.textContent || '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Failed to parse custom page post data:', error)
      return []
    }
  }

  const normalize = value => String(value || '').trim().toLowerCase()

  const buildSearchText = post => normalize([
    post.title,
    post.excerpt,
    ...(post.categories || []).map(item => item.name),
    ...(post.tags || []).map(item => item.name)
  ].join(' '))

  const renderPosts = (container, posts, query = '') => {
    container.innerHTML = posts.map(post => createPostCard(post, query)).join('')
  }

  const initSearchPage = posts => {
    const input = document.getElementById('search-page-input')
    if (!input) return

    const clearButton = document.getElementById('search-page-clear')
    const resultContainer = document.getElementById('search-page-results')
    const countElement = document.getElementById('search-page-count')
    const tipElement = document.getElementById('search-page-query-tip')
    const emptyElement = document.getElementById('search-page-empty')

    const searchablePosts = posts.map(post => ({
      ...post,
      searchText: buildSearchText(post)
    }))

    const update = () => {
      const query = normalize(input.value)
      const filtered = query
        ? searchablePosts.filter(post => post.searchText.includes(query))
        : searchablePosts

      renderPosts(resultContainer, filtered, query)
      countElement.textContent = query
        ? `找到 ${filtered.length} 篇相关文章`
        : `共收录 ${searchablePosts.length} 篇文章`
      tipElement.textContent = query ? `当前关键词：${input.value.trim()}` : '支持标题、摘要、标签和分类联动搜索'
      emptyElement.style.display = filtered.length ? 'none' : 'flex'
    }

    input.addEventListener('input', update)
    clearButton.addEventListener('click', () => {
      input.value = ''
      input.focus()
      update()
    })

    update()
  }

  const countUniqueTags = posts => {
    const uniqueTags = new Set()
    posts.forEach(post => {
      ;(post.tags || []).forEach(tag => uniqueTags.add(tag.name))
    })
    return uniqueTags.size
  }

  const initListPage = posts => {
    const input = document.getElementById('list-page-input')
    if (!input) return

    const clearButton = document.getElementById('list-page-clear')
    const categoriesContainer = document.getElementById('list-page-categories')
    const resultContainer = document.getElementById('list-page-results')
    const summaryElement = document.getElementById('list-page-summary')
    const tipElement = document.getElementById('list-page-filter-tip')
    const emptyElement = document.getElementById('list-page-empty')
    const postStat = document.getElementById('list-page-stat-posts')
    const categoryStat = document.getElementById('list-page-stat-categories')
    const tagStat = document.getElementById('list-page-stat-tags')

    const categoryMap = new Map()
    posts.forEach(post => {
      ;(post.categories || []).forEach(category => {
        const current = categoryMap.get(category.name) || { ...category, count: 0 }
        current.count += 1
        categoryMap.set(category.name, current)
      })
    })

    const categories = Array.from(categoryMap.values()).sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count
      return left.name.localeCompare(right.name, 'zh-CN')
    })

    let activeCategory = ''

    const renderCategoryChips = () => {
      const allButton = `<button class="custom-chip${activeCategory ? '' : ' is-active'}" data-category="">全部 (${posts.length})</button>`
      const buttons = categories.map(category => `
        <button class="custom-chip${activeCategory === category.name ? ' is-active' : ''}" data-category="${escapeHtml(category.name)}">
          ${escapeHtml(category.name)} (${category.count})
        </button>
      `).join('')
      categoriesContainer.innerHTML = allButton + buttons
    }

    const update = () => {
      const query = normalize(input.value)
      const filtered = posts.filter(post => {
        const matchesCategory = !activeCategory || (post.categories || []).some(category => category.name === activeCategory)
        const matchesQuery = !query || buildSearchText(post).includes(query)
        return matchesCategory && matchesQuery
      })

      renderPosts(resultContainer, filtered, query)
      summaryElement.textContent = `显示 ${filtered.length} / ${posts.length} 篇文章`
      tipElement.textContent = activeCategory
        ? `当前分类：${activeCategory}`
        : '可按分类浏览全部文章'
      emptyElement.style.display = filtered.length ? 'none' : 'flex'
    }

    postStat.textContent = String(posts.length)
    categoryStat.textContent = String(categories.length)
    tagStat.textContent = String(countUniqueTags(posts))

    renderCategoryChips()
    update()

    input.addEventListener('input', update)
    clearButton.addEventListener('click', () => {
      input.value = ''
      input.focus()
      update()
    })

    categoriesContainer.addEventListener('click', event => {
      const button = event.target.closest('button[data-category]')
      if (!button) return

      activeCategory = button.dataset.category || ''
      renderCategoryChips()
      update()
    })
  }

  const init = () => {
    const posts = getPostData()
      .slice()
      .sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0))

    if (!posts.length) return

    initSearchPage(posts)
    initListPage(posts)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }

  if (window.btf && typeof window.btf.addGlobalFn === 'function') {
    window.btf.addGlobalFn('pjaxComplete', init, 'customPages')
  }
})()
