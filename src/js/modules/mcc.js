/**
 * MCC Module - Marketing Content Center
 * 
 * Handles post creation, scheduling, and publishing for Instagram + LinkedIn.
 */

export function createMccModule() {
  return {
    // Posts data
    mccPosts: [],
    mccPostsByStatus: {
      draft: [],
      scheduled: [],
      'awaiting-approval': [],
      publishing: [],
      published: [],
      failed: [],
    },
    mccLoading: false,
    mccError: null,
    mccLastRefresh: null,
    
    // Status counts
    mccStatusCounts: {
      draft: 0,
      scheduled: 0,
      'awaiting-approval': 0,
      publishing: 0,
      published: 0,
      failed: 0,
    },
    
    // Platforms
    mccPlatforms: [],
    mccPlatformsLoading: false,
    
    // OAuth status
    mccOauthStatus: {
      instagram: false,
      linkedin: false,
    },
    
    // Composer
    mccComposerOpen: false,
    mccComposerMode: 'create', // 'create' or 'edit'
    mccComposerForm: {
      id: null,
      title: '',
      body: '',
      platforms: [],
      brand: '',
      mediaUrls: [],
      scheduledFor: '',
    },
    mccComposerSaving: false,
    mccComposerError: null,
    
    // Preview
    mccPreviewPlatform: 'instagram',
    
    // Selected post for detail view
    mccSelectedPost: null,
    mccDetailLoading: false,
    
    // ── Initialization ───────────────────────────────────────
    async initMcc() {
      this.mccLoading = true;
      this.mccError = null;
      
      try {
        await Promise.all([
          this.loadMccPosts(),
          this.loadMccStatusCounts(),
          this.loadMccPlatforms(),
        ]);
        this.mccLastRefresh = new Date().toISOString();
      } catch (err) {
        console.error('[mcc] init error:', err);
        this.mccError = err.message;
      } finally {
        this.mccLoading = false;
      }
    },
    
    // ── Data Loading ─────────────────────────────────────────
    async loadMccPosts() {
      try {
        const res = await fetch('/api/mcc/posts?limit=100');
        if (!res.ok) throw new Error('Failed to load posts');
        this.mccPosts = await res.json();
        
        // Group by status
        this.mccPostsByStatus = {
          draft: [],
          scheduled: [],
          'awaiting-approval': [],
          publishing: [],
          published: [],
          failed: [],
        };
        
        for (const post of this.mccPosts) {
          const status = post.status || 'draft';
          if (this.mccPostsByStatus[status]) {
            this.mccPostsByStatus[status].push(post);
          } else {
            this.mccPostsByStatus.draft.push(post);
          }
        }
      } catch (err) {
        console.error('[mcc] loadPosts error:', err);
        throw err;
      }
    },
    
    async loadMccStatusCounts() {
      try {
        const res = await fetch('/api/mcc/status');
        if (!res.ok) throw new Error('Failed to load status');
        this.mccStatusCounts = await res.json();
      } catch (err) {
        console.error('[mcc] loadStatusCounts error:', err);
      }
    },
    
    async loadMccPlatforms() {
      this.mccPlatformsLoading = true;
      try {
        const res = await fetch('/api/mcc/platforms');
        if (!res.ok) throw new Error('Failed to load platforms');
        this.mccPlatforms = await res.json();
        
        // Check OAuth status for each platform
        for (const platform of this.mccPlatforms) {
          // TODO: Check actual token status from API
          this.mccOauthStatus[platform.id] = false;
        }
      } catch (err) {
        console.error('[mcc] loadPlatforms error:', err);
      } finally {
        this.mccPlatformsLoading = false;
      }
    },
    
    // ── Composer ─────────────────────────────────────────────
    openMccComposer(mode = 'create', post = null) {
      this.mccComposerOpen = true;
      this.mccComposerMode = mode;
      
      if (mode === 'edit' && post) {
        this.mccComposerForm = {
          id: post.id,
          title: post.title || '',
          body: post.body || '',
          platforms: post.platforms || [],
          brand: post.brand || '',
          mediaUrls: post.mediaUrls || [],
          scheduledFor: post.scheduledFor || '',
        };
      } else {
        this.mccComposerForm = {
          id: null,
          title: '',
          body: '',
          platforms: [],
          brand: '',
          mediaUrls: [],
          scheduledFor: '',
        };
      }
      
      this.mccComposerError = null;
    },
    
    closeMccComposer() {
      this.mccComposerOpen = false;
      this.mccComposerForm = {
        id: null,
        title: '',
        body: '',
        platforms: [],
        brand: '',
        mediaUrls: [],
        scheduledFor: '',
      };
      this.mccComposerError = null;
    },
    
    async saveMccPost() {
      const { title, body, platforms, brand, mediaUrls, scheduledFor } = this.mccComposerForm;
      
      // Validation
      if (!title && !body) {
        this.mccComposerError = 'Title or body is required';
        return;
      }
      
      if (platforms.length === 0) {
        this.mccComposerError = 'Select at least one platform';
        return;
      }
      
      this.mccComposerSaving = true;
      this.mccComposerError = null;
      
      try {
        const method = this.mccComposerMode === 'edit' ? 'PATCH' : 'POST';
        const url = this.mccComposerMode === 'edit' 
          ? `/api/mcc/posts/${this.mccComposerForm.id}`
          : '/api/mcc/posts';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            platforms,
            brand,
            mediaUrls,
          }),
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save post');
        }
        
        // If scheduled, also schedule it
        if (scheduledFor && this.mccComposerMode === 'create') {
          const post = await res.json();
          await fetch(`/api/mcc/posts/${post.id}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduledFor }),
          });
        }
        
        this.closeMccComposer();
        await this.loadMccPosts();
        await this.loadMccStatusCounts();
        
        // Show success toast
        this.$dispatch('toast', { message: 'Post saved successfully' });
      } catch (err) {
        console.error('[mcc] savePost error:', err);
        this.mccComposerError = err.message;
      } finally {
        this.mccComposerSaving = false;
      }
    },
    
    // ── Actions ───────────────────────────────────────────────
    async scheduleMccPost(postId, scheduledFor) {
      try {
        const res = await fetch(`/api/mcc/posts/${postId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledFor }),
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to schedule post');
        }
        
        await this.loadMccPosts();
        await this.loadMccStatusCounts();
        
        this.$dispatch('toast', { message: 'Post scheduled' });
      } catch (err) {
        console.error('[mcc] schedulePost error:', err);
        this.$dispatch('toast', { message: 'Failed to schedule: ' + err.message, type: 'error' });
      }
    },
    
    async publishMccNow(postId) {
      try {
        const res = await fetch(`/api/mcc/posts/${postId}/publish-now`, {
          method: 'POST',
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to publish');
        }
        
        // The SSE response will handle the approval flow
        // Just refresh after completion
        await this.loadMccPosts();
        await this.loadMccStatusCounts();
        
        this.$dispatch('toast', { message: 'Post published' });
      } catch (err) {
        console.error('[mcc] publishNow error:', err);
        this.$dispatch('toast', { message: 'Failed to publish: ' + err.message, type: 'error' });
      }
    },
    
    async deleteMccPost(postId) {
      if (!confirm('Delete this post?')) return;
      
      try {
        const res = await fetch(`/api/mcc/posts/${postId}`, {
          method: 'DELETE',
        });
        
        if (!res.ok) throw new Error('Failed to delete');
        
        await this.loadMccPosts();
        await this.loadMccStatusCounts();
        
        this.$dispatch('toast', { message: 'Post deleted' });
      } catch (err) {
        console.error('[mcc] deletePost error:', err);
        this.$dispatch('toast', { message: 'Failed to delete: ' + err.message, type: 'error' });
      }
    },
    
    // ── OAuth ─────────────────────────────────────────────────
    async connectPlatform(platform) {
      try {
        const res = await fetch(`/api/mcc/oauth/${platform}/start`);
        if (!res.ok) throw new Error('Failed to start OAuth');
        
        const { authUrl } = await res.json();
        
        // Open OAuth in popup or redirect
        window.open(authUrl, '_blank');
      } catch (err) {
        console.error('[mcc] connectPlatform error:', err);
        this.$dispatch('toast', { message: 'Failed to start OAuth: ' + err.message, type: 'error' });
      }
    },
    
    // ── Helpers ─────────────────────────────────────────────
    getMccStatusLabel(status) {
      const labels = {
        draft: 'Draft',
        scheduled: 'Scheduled',
        'awaiting-approval': 'Awaiting Approval',
        publishing: 'Publishing',
        published: 'Published',
        failed: 'Failed',
      };
      return labels[status] || status;
    },
    
    getMccStatusColor(status) {
      const colors = {
        draft: 'blue',
        scheduled: 'purple',
        'awaiting-approval': 'yellow',
        publishing: 'orange',
        published: 'green',
        failed: 'red',
      };
      return colors[status] || 'gray';
    },
    
    getMccTotalPosts() {
      return Object.values(this.mccStatusCounts).reduce((a, b) => a + b, 0);
    },
    
    getMccScheduledCount() {
      return this.mccStatusCounts.scheduled || 0;
    },
    
    // Preview text based on platform
    getMccPreviewText() {
      const body = this.mccComposerForm.body || '';
      const platform = this.mccPreviewPlatform;
      
      if (platform === 'instagram') {
        // Instagram truncates after 125 chars in preview
        return body.length > 125 ? body.slice(0, 125) + '...' : body;
      }
      
      // LinkedIn shows more
      return body;
    },
    
    // Refresh
    async refreshMcc() {
      await this.initMcc();
    },
  };
}