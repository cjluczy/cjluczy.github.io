'use strict';

(() => {
  const LIVE2D_ROOT = '/live2d'
  const CONFIG = {
    path: {
      homePath: '/',
      modelPath: `${LIVE2D_ROOT}/Resources/`,
      cssPath: `${LIVE2D_ROOT}/waifu.css`,
      tipsJsonPath: `${LIVE2D_ROOT}/waifu-tips.json`,
      tipsJsPath: `${LIVE2D_ROOT}/waifu-tips.js`,
      live2dCorePath: `${LIVE2D_ROOT}/Core/live2dcubismcore.js`,
      live2dSdkPath: `${LIVE2D_ROOT}/live2d-sdk.js`
    },
    tools: ['hitokoto', 'express', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
    drag: {
      enable: true,
      direction: ['x', 'y']
    },
    switchType: 'order'
  }

  const loadExternalResource = (url, type) => new Promise((resolve, reject) => {
    const selector = type === 'css' ? `link[href="${url}"]` : `script[src="${url}"]`
    const existing = document.querySelector(selector)

    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${url}`)), { once: true })
      return
    }

    let tag
    if (type === 'css') {
      tag = document.createElement('link')
      tag.rel = 'stylesheet'
      tag.href = url
    } else {
      tag = document.createElement('script')
      tag.src = url
      tag.async = true
    }

    tag.onload = () => {
      tag.dataset.loaded = 'true'
      resolve()
    }
    tag.onerror = () => reject(new Error(`Failed to load ${url}`))
    document.head.appendChild(tag)
  })

  const boot = () => {
    if (window.__czBlogLive2dLoading || window.__czBlogLive2dInitialized) return
    if (document.getElementById('waifu')) {
      window.__czBlogLive2dInitialized = true
      return
    }

    window.__czBlogLive2dLoading = true

    Promise.all([
      loadExternalResource(CONFIG.path.cssPath, 'css'),
      loadExternalResource(CONFIG.path.live2dCorePath, 'js'),
      loadExternalResource(CONFIG.path.live2dSdkPath, 'js'),
      loadExternalResource(CONFIG.path.tipsJsPath, 'js')
    ]).then(() => {
      if (typeof window.initWidget !== 'function') return

      window.initWidget({
        homePath: CONFIG.path.homePath,
        waifuPath: CONFIG.path.tipsJsonPath,
        cdnPath: CONFIG.path.modelPath,
        tools: CONFIG.tools,
        dragEnable: CONFIG.drag.enable,
        dragDirection: CONFIG.drag.direction,
        switchType: CONFIG.switchType
      })

      window.__czBlogLive2dInitialized = true
    }).catch(err => {
      console.warn('[live2d]', err.message)
    }).finally(() => {
      window.__czBlogLive2dLoading = false
    })
  }

  const scheduleBoot = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(boot, { timeout: 4000 })
    } else {
      window.setTimeout(boot, 1200)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleBoot, { once: true })
  } else {
    scheduleBoot()
  }

  document.addEventListener('pjax:complete', () => {
    window.setTimeout(boot, 200)
  })
})()
