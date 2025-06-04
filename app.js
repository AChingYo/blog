document.addEventListener('DOMContentLoaded', () => {
    const postListUl = document.getElementById('post-list');
    const postContentDiv = document.getElementById('post-content');

    // In a real scenario, you might fetch this list from a server
    // or a manifest file. For now, it's hardcoded.
    const posts = [
        'first_post.md',
        'vim 基本指令教學.md',
        '驚險的一場車禍.md',
        '20200803-但以理書.md',
        '20200817-撒迦利亞.md'
    ];

    // Placeholder for Markdown rendering
    // We'll replace this with a proper library later
    function renderMarkdown(markdownText) {
        if (typeof marked === 'undefined') {
            console.error('Marked.js library not loaded.');
            // Fallback to preformatted text if marked is not available
            const escapedHtml = markdownText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
            return `<pre>${escapedHtml}</pre>`;
        }
        return marked.parse(markdownText);
    }

    async function fetchAndDisplayPost(fileName) {
        if (!postContentDiv) {
            console.error('Error: post-content div not found.');
            return;
        }
        postContentDiv.innerHTML = '<p>Loading...</p>';
        try {
            const response = await fetch(`posts/${fileName}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${fileName}`);
            }
            let markdownText = await response.text();

            // Strip YAML frontmatter
            const firstSeparator = markdownText.indexOf('---');
            if (firstSeparator === 0 || (firstSeparator > 0 && markdownText[firstSeparator-1] === '\n')) {
                const secondSeparator = markdownText.indexOf('---', firstSeparator + 3);
                if (secondSeparator !== -1) {
                    const afterSecondSeparator = markdownText.indexOf('\n', secondSeparator + 3);
                    if (afterSecondSeparator !== -1) {
                        markdownText = markdownText.substring(afterSecondSeparator + 1);
                    } else {
                        // Edge case: file ends right after the second '---'
                        markdownText = '';
                    }
                }
            }

            postContentDiv.innerHTML = renderMarkdown(markdownText);
        } catch (error) {
            console.error('Error fetching post:', error);
            postContentDiv.innerHTML = `<p>Error loading post: ${error.message}. Check the console for more details.</p>`;
        }
    }

    function loadPostList() {
        if (!postListUl) {
            console.error('Error: post-list ul not found.');
            return;
        }
        postListUl.innerHTML = ''; // Clear existing list

        posts.forEach(fileName => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            // Create a more user-friendly title from the filename
            let displayTitle = fileName.replace('.md', '').replace(/_/g, ' ');
            // Capitalize first letter of each word
            displayTitle = displayTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            link.textContent = displayTitle;
            link.href = `#${fileName}`; // Use hash for navigation, helps identify current post

            link.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default anchor behavior
                fetchAndDisplayPost(fileName);
                // Update URL hash
                window.location.hash = fileName;
            });

            listItem.appendChild(link);
            postListUl.appendChild(listItem);
        });
    }

    // Initial setup
    loadPostList();

    // Optional: Load a post based on URL hash or default to first post
    if (window.location.hash) {
        const postFromHash = window.location.hash.substring(1); // Remove #
        if (posts.includes(postFromHash)) {
            fetchAndDisplayPost(postFromHash);
        } else if (posts.length > 0) {
            // Fallback to first post if hash is invalid
            fetchAndDisplayPost(posts[0]);
        } else {
             if (postContentDiv) postContentDiv.innerHTML = '<p>No posts found.</p>';
        }
    } else if (posts.length > 0) {
        fetchAndDisplayPost(posts[0]); // Load the first post by default
    } else {
        if (postContentDiv) postContentDiv.innerHTML = '<p>No posts found.</p>';
    }
});
