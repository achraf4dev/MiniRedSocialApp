// Connect to the WebSocket server
const socket = io();

// Function to get the current user ID from the page
function getCurrentUserId() {
  return document.querySelector('meta[name="user-id"]')?.getAttribute('content');
}

// When the page loads, authenticate the socket connection
document.addEventListener('DOMContentLoaded', () => {
  const userId = getCurrentUserId();
  
  if (userId) {
    socket.emit('authenticate', userId);
    
    // Initial notifications count update
    updateNotificationCount();
  }
  
  // Handle new posts
  socket.on('new-post', (data) => {
    const postsContainer = document.querySelector('.posts-container');
    
    if (postsContainer) {
      const newPostHtml = createPostElement(data.post, data.authorName);
      postsContainer.insertAdjacentHTML('afterbegin', newPostHtml);
    }
  });
  
  // Handle edit posts
  socket.on('edit-post', (data) => {
    const postElement = document.querySelector(`#post-${data.post._id}`);
    
    if (postElement) {
      const contentElement = postElement.querySelector('.post-content');
      if (contentElement) {
        contentElement.textContent = data.post.content;
      }
    }
  });
  
  // Handle delete posts
  socket.on('delete-post', (data) => {
    const postElement = document.querySelector(`#post-${data.postId}`);
    
    if (postElement) {
      postElement.remove();
    }
  });
  
  // Handle new comments
  socket.on('new-comment', (data) => {
    const commentsContainer = document.querySelector(`#comments-${data.postId}`);
    
    if (commentsContainer) {
      const newCommentHtml = createCommentElement(data.comment, data.authorName);
      commentsContainer.insertAdjacentHTML('beforeend', newCommentHtml);
    }
  });
  
  // Handle new notifications
  socket.on('new-notification', (data) => {
    // Show toast notification
    showToast(data.message, data.postId);
    
    // Update the notification count
    updateNotificationCount();
  });
  
  // Handle when notifications are read
  socket.on('notifications-read', () => {
    updateNotificationCount();
  });
  
  socket.on('notification-read', () => {
    updateNotificationCount();
  });
});

// Function to create a post HTML element from data
function createPostElement(post, authorName) {
  const postDate = new Date(post.createdAt).toLocaleString();
  
  return `
    <div class="bg-white shadow-sm rounded-lg p-6 hover:shadow-md transition-all border border-gray-100" id="post-${post._id}">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <a href="/profile/${post.author.username || 'user'}">
              <div class="h-10 w-10 rounded-full overflow-hidden border border-gray-200">
                <img src="${post.author.displayPhoto || '/public/images/default.png'}" alt="${post.author.username || 'user'}" class="h-full w-full object-cover">
              </div>
            </a>
          </div>
          <div class="ml-3">
            <a href="/profile/${post.author.username || 'user'}" class="text-sm font-medium text-gray-900 hover:underline">${authorName}</a>
            <p class="text-xs text-gray-500">Posted on ${postDate}</p>
          </div>
        </div>
        <a href="/posts/${post._id}" class="btn btn-primary btn-sm">View Post</a>
      </div>
      <p class="text-gray-700 mb-4 text-sm leading-relaxed post-content">${post.content}</p>
      <a href="/posts/${post._id}" class="text-sm font-medium text-primary hover:text-secondary transition-all inline-flex items-center">
        Ver detalles y comentarios 
        <svg class="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </a>
    </div>
  `;
}

// Function to create a comment HTML element from data
function createCommentElement(comment, authorName) {
  const commentDate = new Date(comment.createdAt).toLocaleString();
  
  return `
    <div class="bg-white shadow-sm rounded-lg p-4 hover:shadow-md transition-all border border-gray-100" id="comment-${comment._id}">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <a href="/profile/${comment.author.username || 'user'}">
              <div class="h-8 w-8 rounded-full overflow-hidden border border-gray-200">
                <img src="${comment.author.displayPhoto || '/public/images/default.png'}" alt="${comment.author.username || 'user'}" class="h-full w-full object-cover">
              </div>
            </a>
          </div>
          <div class="ml-3">
            <a href="/profile/${comment.author.username || 'user'}" class="text-sm font-medium text-gray-900 hover:underline">${authorName}</a>
            <p class="text-xs text-gray-500">Commented on ${commentDate}</p>
          </div>
        </div>
      </div>
      <p class="text-gray-700 text-sm">${comment.content}</p>
    </div>
  `;
}

// Function to show toast notification
function showToast(message, postId) {
  // Check if Bootstrap is available
  if (typeof bootstrap === 'undefined') {
    console.warn('Bootstrap not available for toasts, falling back to alert');
    alert(message);
    return;
  }

  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = 1050;
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = 'toast';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">Notification</strong>
      <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
    <div class="toast-body">
      ${message}
      ${postId ? `<a href="/posts/${postId}" class="btn btn-primary btn-sm mt-2">View</a>` : ''}
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Initialize and show the toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
  
  // Remove toast after it's hidden
  toast.addEventListener('hidden.bs.toast', () => {
    toast.remove();
  });
}

// Function to update the notification count
function updateNotificationCount() {
  fetch('/notifications/api/count')
    .then(response => response.json())
    .then(data => {
      const notificationBadge = document.querySelector('.notification-badge');
      if (notificationBadge) {
        if (data.count > 0) {
          notificationBadge.textContent = data.count;
          notificationBadge.classList.remove('d-none');
        } else {
          notificationBadge.classList.add('d-none');
        }
      }
    })
    .catch(error => console.error('Error fetching notification count:', error));
} 