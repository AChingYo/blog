document.addEventListener('DOMContentLoaded', () => {
    const postListUl = document.getElementById('post-list');
    const postContentDiv = document.getElementById('post-content');
    const filterTitleInput = document.getElementById('filter-title');
    const filterDateInput = document.getElementById('filter-date');
    const filterCategoryInput = document.getElementById('filter-category');
    // const filterTagsInput = document.getElementById('filter-tags'); // Removed
    const tagInput = document.getElementById('tag-input');
    const tagsDisplayArea = document.getElementById('tags-display-area');
    const filterButton = document.getElementById('filter-button');

    let allPostsData = []; // To store post data including frontmatter
    let currentlyDisplayedPosts = []; // To store the posts currently shown in the list
    let activeTags = []; // To store current active filter tags

    // In a real scenario, you might fetch this list from a server
    // or a manifest file. For now, it's hardcoded.
    const posts = [
        'first_post.md',
        'vim 基本指令教學.md',
        '驚險的一場車禍.md',
        '20200803-但以理書.md',
        '20200817-撒迦利亞.md'
    ];

    function parseFrontmatter(markdownText) {
        const frontmatter = {
            title: '',
            date: '',
            categories: [],
            tags: []
        };
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
        const match = markdownText.match(frontmatterRegex);

        if (match && match[1]) {
            const frontmatterContent = match[1];
            frontmatterContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split(':');
                const value = valueParts.join(':').trim();
                if (key && value) {
                    if (key === 'title') {
                        frontmatter.title = value.replace(/^["'](.*)["']$/, '$1');
                    } else if (key === 'date') {
                        frontmatter.date = value;
                    } else if (key === 'categories' || key === 'tags') {
                        frontmatter[key] = value.startsWith('[') && value.endsWith(']') ?
                            value.substring(1, value.length - 1).split(',').map(item => item.trim().replace(/^["'](.*)["']$/, '$1')) :
                            [value.replace(/^["'](.*)["']$/, '$1')];
                    }
                }
            });
        }
        return frontmatter;
    }

    function addTag(tagText) {
        const trimmedTag = tagText.trim();
        if (!trimmedTag || activeTags.includes(trimmedTag.toLowerCase())) {
            return;
        }
        activeTags.push(trimmedTag.toLowerCase());

        const tagBadge = document.createElement('span');
        tagBadge.classList.add('tag-badge');
        tagBadge.textContent = trimmedTag;

        const removeTagSpan = document.createElement('span');
        removeTagSpan.classList.add('remove-tag');
        removeTagSpan.innerHTML = '&times;'; // 'x' symbol
        removeTagSpan.style.marginLeft = '5px';
        removeTagSpan.style.cursor = 'pointer';
        removeTagSpan.dataset.tag = trimmedTag.toLowerCase();

        removeTagSpan.addEventListener('click', () => {
            removeTag(trimmedTag.toLowerCase());
            filterPosts(); // Re-filter posts after removing a tag
        });

        tagBadge.appendChild(removeTagSpan);
        tagsDisplayArea.appendChild(tagBadge);

        const poolTagElement = document.querySelector(`#tag-pool-available .pool-tag[data-tag="${trimmedTag.toLowerCase()}"]`);
        if (poolTagElement) {
            poolTagElement.classList.add('pool-tag-active');
        }
    }

    function removeTag(tagText) {
        activeTags = activeTags.filter(t => t !== tagText.toLowerCase());
        const badgeToRemove = tagsDisplayArea.querySelector(`.tag-badge .remove-tag[data-tag="${tagText.toLowerCase()}"]`);
        if (badgeToRemove && badgeToRemove.parentElement) {
            tagsDisplayArea.removeChild(badgeToRemove.parentElement);
        }

        const poolTagElement = document.querySelector(`#tag-pool-available .pool-tag[data-tag="${tagText.toLowerCase()}"]`);
        if (poolTagElement) {
            poolTagElement.classList.remove('pool-tag-active');
        }
    }

    if (tagInput) {
        tagInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && tagInput.value.trim() !== '') {
                event.preventDefault();
                addTag(tagInput.value);
                tagInput.value = '';
                filterPosts(); // Re-filter posts after adding a tag
            }
        });
    }

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
            const response = await fetch(`https://raw.githubusercontent.com/AChingYo/blog/master/posts/${fileName}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${fileName}`);
            }
            const rawMarkdownText = await response.text();
            const frontmatter = parseFrontmatter(rawMarkdownText);

            // Store or update post data with frontmatter
            const postIndex = allPostsData.findIndex(p => p.fileName === fileName);
            if (postIndex > -1) {
                allPostsData[postIndex] = { ...allPostsData[postIndex], ...frontmatter };
            } else {
                allPostsData.push({ fileName, ...frontmatter });
            }

            // Strip YAML frontmatter for rendering
            let contentToRender = rawMarkdownText;
            const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
            const match = rawMarkdownText.match(frontmatterRegex);
            if (match) {
                contentToRender = rawMarkdownText.substring(match[0].length);
            }

            postContentDiv.innerHTML = renderMarkdown(contentToRender);
            // Update post title in the list if available from frontmatter
            const listItemLink = postListUl.querySelector(`a[href="#${fileName}"]`);
            if (listItemLink && frontmatter.title) {
                listItemLink.textContent = frontmatter.title;
            }

        } catch (error) {
            console.error('Error fetching post:', error);
            postContentDiv.innerHTML = `<p>Error loading post: ${error.message}. Check the console for more details.</p>`;
        }
    }

    function displayUniqueTags(posts) {
        const tagPoolAvailableDiv = document.getElementById('tag-pool-available');
        if (!tagPoolAvailableDiv) {
            console.warn('Tag pool available div not found.');
            return;
        }
        tagPoolAvailableDiv.innerHTML = ''; // Clear previous tags

        const uniqueTags = new Set();
        posts.forEach(post => {
            if (post.tags && Array.isArray(post.tags)) {
                post.tags.forEach(tag => {
                    if (tag.trim() !== '') {
                        uniqueTags.add(tag.trim().toLowerCase());
                    }
                });
            }
        });

        if (uniqueTags.size === 0) {
            tagPoolAvailableDiv.innerHTML = '<p style="font-size: 0.9em; color: #777;">No tags found in posts.</p>';
            return;
        }

        uniqueTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag-badge', 'pool-tag'); // Add 'pool-tag' for specific styling/selection
            tagElement.textContent = tag;
            tagElement.dataset.tag = tag; // Store tag name in dataset for easy access

            // Add click event listener
            tagElement.addEventListener('click', () => {
                addTag(tag); // Add the tag to active filters
                filterPosts(); // Re-filter posts
            });

            tagPoolAvailableDiv.appendChild(tagElement);
        });
    }

    function loadPostList() {
        if (!postListUl) {
            console.error('Error: post-list ul not found.');
            return;
        }
        postListUl.innerHTML = ''; // Clear existing list
        allPostsData = []; // Reset data

        // Fetch frontmatter for all posts
        const fetchPromises = posts.map(async (fileName) => {
            try {
                const response = await fetch(`https://raw.githubusercontent.com/AChingYo/blog/master/posts/${fileName}`, { cache: 'no-store' });
                if (!response.ok) {
                    console.warn(`Failed to fetch ${fileName} for frontmatter parsing: ${response.status}`);
                    return { fileName, title: fileName.replace('.md', '').replace(/_/g, ' '), date: '', categories: [], tags: [] }; // Fallback data
                }
                const rawMarkdownText = await response.text();
                const frontmatter = parseFrontmatter(rawMarkdownText);
                return { fileName, ...frontmatter };
            } catch (error) {
                console.warn(`Error fetching ${fileName} for frontmatter parsing:`, error);
                return { fileName, title: fileName.replace('.md', '').replace(/_/g, ' '), date: '', categories: [], tags: [] }; // Fallback data
            }
        });

        Promise.all(fetchPromises).then(results => {
            allPostsData = results;
            // Sort posts by date if available, most recent first
            allPostsData.sort((a, b) => {
                if (a.date && b.date) {
                    return new Date(b.date) - new Date(a.date);
                }
                if (a.date) return -1; // a has date, b doesn't, a comes first
                if (b.date) return 1;  // b has date, a doesn't, b comes first
                return 0; // no dates or same date
            });
            currentlyDisplayedPosts = [...allPostsData]; // Initially, all posts are displayed
            populatePostList(currentlyDisplayedPosts);
            displayUniqueTags(allPostsData); // Display unique tags
            initializeDiaryAfterListLoad();
        }).catch(error => {
            console.error("Error fetching or parsing frontmatter for post list:", error);
            currentlyDisplayedPosts = posts.map(fileName => ({ fileName, title: fileName.replace('.md', '').replace(/_/g, ' '), date: '', categories: [], tags: [] }));
            // Fallback: load list with filenames if Promise.all fails
            populatePostList(currentlyDisplayedPosts);
            initializeDiaryAfterListLoad();
        });
    }

    function populatePostList(postsToDisplay) {
        if (!postListUl) return;
        postListUl.innerHTML = ''; // Clear existing list

        if (postsToDisplay.length === 0) {
            postListUl.innerHTML = '<li>No posts match your criteria.</li>';
            return;
        }

        postsToDisplay.forEach(postData => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            let displayTitle = postData.title || postData.fileName.replace('.md', '').replace(/_/g, ' ');
            if (!postData.title) {
                displayTitle = displayTitle.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }
            link.textContent = displayTitle;
            link.href = `#${postData.fileName}`;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                fetchAndDisplayPost(postData.fileName);
                window.location.hash = postData.fileName;
            });
            listItem.appendChild(link);
            postListUl.appendChild(listItem);
        });
    }

    function filterPosts() {
        const titleFilter = filterTitleInput.value.toLowerCase();
        const dateFilter = filterDateInput.value;
        const categoryFilter = filterCategoryInput.value.toLowerCase();
        // const tagsFilterText = filterTagsInput.value.toLowerCase(); // Removed
        // const tagsFilter = tagsFilterText ? tagsFilterText.split(',').map(t => t.trim()).filter(t => t) : []; // Removed

        currentlyDisplayedPosts = allPostsData.filter(post => {
            const postTitle = (post.title || '').toLowerCase();
            const postDate = post.date || '';
            const postCategories = post.categories.map(c => c.toLowerCase());
            const postTags = post.tags.map(t => t.toLowerCase());

            if (titleFilter && !postTitle.includes(titleFilter)) {
                return false;
            }
            if (dateFilter && postDate !== dateFilter) {
                return false;
            }
            if (categoryFilter && !postCategories.includes(categoryFilter)) {
                return false;
            }
            // Updated tag filtering logic
            if (activeTags.length > 0 && !activeTags.every(filterTag => postTags.includes(filterTag.toLowerCase()))) {
                // If you want posts that include *any* of the activeTags, use .some() instead of .every()
                // For example: if (activeTags.length > 0 && !activeTags.some(filterTag => postTags.includes(filterTag.toLowerCase())))
                return false;
            }
            return true;
        });

        populatePostList(currentlyDisplayedPosts);
        // After filtering, if there are posts, display the first one from the filtered list
        // or clear content if no posts match.
        if (currentlyDisplayedPosts.length > 0) {
            // Check if current hash is in the filtered list, if not, load the first one.
            const currentHash = window.location.hash.substring(1);
            const isCurrentPostInFilteredList = currentlyDisplayedPosts.some(p => p.fileName === currentHash);
            if(!isCurrentPostInFilteredList) {
                fetchAndDisplayPost(currentlyDisplayedPosts[0].fileName);
                window.location.hash = currentlyDisplayedPosts[0].fileName;
            } else {
                 // If current post is still in list, do nothing or re-fetch if state might have changed
                 // For now, assume it's fine.
            }
        } else {
            if (postContentDiv) postContentDiv.innerHTML = '<p>No posts match your criteria. Select a new filter or clear filters.</p>';
             window.location.hash = ''; // Clear hash if no posts are displayed
        }
    }

    if (filterButton) {
        filterButton.addEventListener('click', filterPosts);
    }

    // Initial setup
    // loadPostList(); // loadPostList is now called after marked is loaded.

    function initializeDiaryAfterListLoad() {
        const currentHash = window.location.hash.substring(1);
        let postToLoad = null;

        // Use currentlyDisplayedPosts which is initially allPostsData or could be filtered if page reloads with filters
        if (currentHash && currentlyDisplayedPosts.some(p => p.fileName === currentHash)) {
            postToLoad = currentHash;
        } else if (currentlyDisplayedPosts.length > 0) {
            postToLoad = currentlyDisplayedPosts[0].fileName; // Load the first post from the current list
        }

        if (postToLoad) {
            fetchAndDisplayPost(postToLoad);
            // Only update hash if it's different or was empty, to avoid loop & respect initial filtered view
            if (window.location.hash.substring(1) !== postToLoad) {
                 window.location.hash = postToLoad;
            }
        } else {
            if (postContentDiv) postContentDiv.innerHTML = '<p>No posts found or available to display. Try adjusting filters.</p>';
        }
    }

    function mainInitialization() {
        // Ensure filter inputs don't persist values across page loads if not desired
        if (filterTitleInput) filterTitleInput.value = '';
        if (filterDateInput) filterDateInput.value = '';
        if (filterCategoryInput) filterCategoryInput.value = '';
        // if (filterTagsInput) filterTagsInput.value = ''; // Removed

        activeTags = []; // Clear active tags array
        if (tagsDisplayArea) tagsDisplayArea.innerHTML = ''; // Clear displayed tags
        if (document.getElementById('tag-pool-available')) document.getElementById('tag-pool-available').innerHTML = ''; // Clear available tags pool

        loadPostList(); // This will now fetch frontmatter, populate list, and then call initializeDiaryAfterListLoad
    }

    const markedScript = document.getElementById('marked-script');

    if (typeof marked !== 'undefined') {
        mainInitialization();
    } else if (markedScript) {
        markedScript.onload = mainInitialization;
        markedScript.onerror = () => {
            console.error('Marked.js script failed to load. Markdown rendering will not work.');
            mainInitialization();
        };
    } else {
        console.error('Marked script tag not found. Initial post loading might fail.');
        mainInitialization();
    }
});
