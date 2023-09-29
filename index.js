const express = require('express');
const axios = require('axios');
const _ = require('lodash');

const app = express();
app.use(express.json());

const API_URL = 'https://intent-kit-16.hasura.app/api/rest/blogs';
const API_SECRET = '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6';

// Caching mechanism using Lodash's memoize function
const memoizedFetchData = _.memoize(async () => {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        'x-hasura-admin-secret': API_SECRET
      }
    });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching data from the API');
  }
}, () => 'cache_key'); // Memoize function always uses the same cache key

// Middleware for fetching and analyzing blog data
const fetchBlogData = async (req, res, next) => {
  try {
    const blogs = await memoizedFetchData();

    // Analytics
    const totalBlogs = blogs.length;
    const longestBlog = _.maxBy(blogs, 'title') || { title: 'N/A' };
    const privacyBlogs = _.filter(blogs, blog => _.includes(_.toLower(blog.title), 'privacy'));
    const uniqueTitles = _.uniqBy(blogs, 'title');

    // Store analytics results in the request object for later use
    req.blogAnalytics = {
      totalBlogs,
      longestBlog: longestBlog.title,
      privacyBlogs: privacyBlogs.length,
      uniqueTitles: _.map(uniqueTitles, 'title')
    };
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Route for blog statistics
app.get('/api/blog-stats', fetchBlogData, (req, res) => {
  res.json(req.blogAnalytics);
});

// Route for blog search
app.get('/api/blog-search', fetchBlogData, (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  // Original search implementation
  const filteredBlogs = _.filter(req.blogAnalytics.uniqueTitles, title => _.includes(_.toLower(title), _.toLower(query)));
  res.json(filteredBlogs);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
