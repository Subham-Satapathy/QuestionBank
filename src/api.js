require('dotenv').config();
const { MongoStorage } = require('./mongoStorage');

class DeepseekAPI {
    constructor() {
        this.apiKey = process.env.API_KEY;
        this.baseURL = process.env.DEEPSEEK_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions';
        this.testMode = process.env.TEST_MODE === 'true' || !this.apiKey;
        
        if (!this.apiKey && !this.testMode) {
            throw new Error('API_KEY environment variable is required');
        }
    }

    async fetchQuestions(topic, count = 5, difficulty = 'mixed') {
        if (this.testMode) {
            console.log('🧪 Running in test mode - generating mock questions...');
            return this.generateMockQuestions(topic, count, difficulty);
        }

        try {
            const prompt = this.generatePrompt(topic, count, difficulty);
            
            const response = await fetch(this.baseURL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
                    "X-Title": process.env.SITE_NAME || "Question Bank CLI",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "deepseek/deepseek-chat-v3-0324:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a coding interview expert. Generate coding questions in valid JSON format only."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content;
            const parsedQuestions = this.parseQuestions(content, topic);
            
            // If no questions were parsed successfully, fall back to mock questions
            if (parsedQuestions.length === 0) {
                console.warn('⚠️  No questions could be parsed from API response, falling back to mock questions');
                return this.generateMockQuestions(topic, count, difficulty);
            }
            
            // If we got fewer questions than requested, supplement with mock questions
            if (parsedQuestions.length < count) {
                console.log(`ℹ️  Only ${parsedQuestions.length} questions parsed successfully, supplementing with ${count - parsedQuestions.length} mock questions`);
                const mockQuestions = this.generateMockQuestions(topic, count - parsedQuestions.length, difficulty);
                return [...parsedQuestions, ...mockQuestions];
            }
            
            return parsedQuestions;
            
        } catch (error) {
            console.warn('⚠️  API request failed:', error.message);
            console.log('🔄 Falling back to mock questions...');
            return this.generateMockQuestions(topic, count, difficulty);
        }
    }

    async saveQuestionsToMongoDB(topic, questions) {
        try {
            const storage = new MongoStorage();
            const result = await storage.saveQuestions(topic, questions);
            await storage.disconnect();
            return result;
        } catch (error) {
            console.error('❌ Error saving questions to MongoDB:', error);
            throw error;
        }
    }

    async getQuestionsFromMongoDB(topic, options = {}) {
        try {
            const storage = new MongoStorage();
            const questions = await storage.loadQuestions(topic);
            await storage.disconnect();
            return questions;
        } catch (error) {
            console.error('❌ Error loading questions from MongoDB:', error);
            return [];
        }
    }

    async searchQuestionsInMongoDB(searchText, options = {}) {
        try {
            const storage = new MongoStorage();
            const questions = await storage.searchQuestions(searchText, options);
            await storage.disconnect();
            return questions;
        } catch (error) {
            console.error('❌ Error searching questions in MongoDB:', error);
            return [];
        }
    }

    async getStatsFromMongoDB() {
        try {
            const storage = new MongoStorage();
            const stats = await storage.getStats();
            await storage.disconnect();
            return stats;
        } catch (error) {
            console.error('❌ Error getting stats from MongoDB:', error);
            return {};
        }
    }

    generateMockQuestions(topic, count, difficulty = 'mixed') {
        const mockQuestions = {
            javascript: {
                easy: [
                    {
                        question: "Write a function that reverses a string without using built-in reverse methods.",
                        difficulty: "easy",
                        tags: ["strings", "algorithms"],
                        example: "reverseString('hello') // returns 'olleh'",
                        options: [
                            "Use a for loop to iterate backwards",
                            "Use recursion to reverse the string",
                            "Convert to array, reverse, then join",
                            "Use two pointers approach"
                        ],
                        answer: "Use a for loop to iterate backwards"
                    },
                    {
                        question: "Create a function that checks if a number is even or odd.",
                        difficulty: "easy",
                        tags: ["math", "basics"],
                        example: "isEven(4) // returns true",
                        options: [
                            "Use modulo operator (%)",
                            "Use bitwise AND operator",
                            "Divide by 2 and check remainder",
                            "Use Math.floor() comparison"
                        ],
                        answer: "Use modulo operator (%)"
                    }
                ],
                medium: [
                    {
                        question: "Implement a function to check if a string has all unique characters.",
                        difficulty: "medium",
                        tags: ["strings", "hash-table"],
                        example: "hasUniqueChars('abcdef') // returns true",
                        options: [
                            "Use a Set to track seen characters",
                            "Use nested loops to compare each character",
                            "Sort string and check adjacent characters",
                            "Use a frequency map object"
                        ],
                        answer: "Use a Set to track seen characters"
                    },
                    {
                        question: "Create a function that finds the first non-repeating character in a string.",
                        difficulty: "medium",
                        tags: ["strings", "hash-table"],
                        example: "firstNonRepeating('abccba') // returns null",
                        options: [
                            "Two-pass approach with frequency map",
                            "Single pass with Map tracking indices",
                            "Use filter and indexOf methods",
                            "Recursive approach with character counting"
                        ],
                        answer: "Two-pass approach with frequency map"
                    }
                ],
                hard: [
                    {
                        question: "Implement a function to find the longest palindromic substring.",
                        difficulty: "hard",
                        tags: ["strings", "dynamic-programming"],
                        example: "longestPalindrome('babad') // returns 'bab' or 'aba'",
                        options: [
                            "Expand around centers approach",
                            "Dynamic programming with 2D table",
                            "Manacher's algorithm",
                            "Brute force with palindrome checking"
                        ],
                        answer: "Expand around centers approach"
                    }
                ]
            },
            typescript: {
                easy: [
                    {
                        question: "Create a type-safe function that accepts a string or number.",
                        difficulty: "easy",
                        tags: ["types", "union-types"],
                        example: "function process(value: string | number)",
                        options: [
                            "Use union types (string | number)",
                            "Use generic constraints",
                            "Use function overloads",
                            "Use conditional types"
                        ],
                        answer: "Use union types (string | number)"
                    }
                ],
                medium: [
                    {
                        question: "Create a generic function that safely gets a nested property from an object.",
                        difficulty: "medium",
                        tags: ["generics", "type-safety"],
                        example: "getNestedProperty(obj, 'user.profile.name')",
                        options: [
                            "Use keyof and template literal types",
                            "Use recursive type definitions",
                            "Use mapped types with conditional logic",
                            "Use utility types like Pick and Partial"
                        ],
                        answer: "Use keyof and template literal types"
                    }
                ],
                hard: [
                    {
                        question: "Implement a type-safe event emitter using TypeScript generics.",
                        difficulty: "hard",
                        tags: ["generics", "events", "type-safety"],
                        example: "EventEmitter<{ click: MouseEvent; change: string }>",
                        options: [
                            "Use mapped types with function signatures",
                            "Use conditional types with infer keyword",
                            "Use template literal types for event names",
                            "Use recursive type definitions"
                        ],
                        answer: "Use mapped types with function signatures"
                    }
                ]
            },
            nodejs: {
                easy: [
                    {
                        question: "Create a simple HTTP server that handles GET requests.",
                        difficulty: "easy",
                        tags: ["http", "server"],
                        example: "Server should respond to /api/health endpoint",
                        options: [
                            "Use http.createServer() method",
                            "Use Express.js framework",
                            "Use Fastify framework",
                            "Use built-in URL module for routing"
                        ],
                        answer: "Use http.createServer() method"
                    }
                ],
                medium: [
                    {
                        question: "Implement a file upload handler with size validation.",
                        difficulty: "medium",
                        tags: ["file-system", "validation"],
                        example: "Upload should reject files larger than 5MB",
                        options: [
                            "Use multer middleware with limits",
                            "Use fs.createReadStream() with size checking",
                            "Use formidable with maxFileSize option",
                            "Manual buffer size validation"
                        ],
                        answer: "Use multer middleware with limits"
                    }
                ],
                hard: [
                    {
                        question: "Create a rate limiter middleware for Express applications.",
                        difficulty: "hard",
                        tags: ["middleware", "rate-limiting", "redis"],
                        example: "Limit to 100 requests per hour per IP",
                        options: [
                            "Use Redis with sliding window algorithm",
                            "Use in-memory Map with token bucket",
                            "Use express-rate-limit package",
                            "Use fixed window counter approach"
                        ],
                        answer: "Use Redis with sliding window algorithm"
                    }
                ]
            },
            sql: {
                easy: [
                    {
                        question: "Write a query to select all employees with salary greater than 50000.",
                        difficulty: "easy",
                        tags: ["select", "where"],
                        example: "SELECT * FROM employees WHERE salary > 50000",
                        options: [
                            "Use WHERE clause with comparison operator",
                            "Use HAVING clause after GROUP BY",
                            "Use subquery with EXISTS",
                            "Use CASE statement for conditional logic"
                        ],
                        answer: "Use WHERE clause with comparison operator"
                    }
                ],
                medium: [
                    {
                        question: "Write a query to find the second highest salary from an employees table.",
                        difficulty: "medium",
                        tags: ["subqueries", "ranking"],
                        example: "Find salary that is second highest in the table",
                        options: [
                            "Use LIMIT with OFFSET",
                            "Use ROW_NUMBER() window function",
                            "Use MAX() with subquery exclusion",
                            "Use DENSE_RANK() window function"
                        ],
                        answer: "Use ROW_NUMBER() window function"
                    }
                ],
                hard: [
                    {
                        question: "Create a query to find employees who earn more than their manager.",
                        difficulty: "hard",
                        tags: ["joins", "self-join"],
                        example: "Compare employee.salary with manager.salary",
                        options: [
                            "Use self-join on manager_id",
                            "Use correlated subquery",
                            "Use window functions with LAG",
                            "Use EXISTS with subquery"
                        ],
                        answer: "Use self-join on manager_id"
                    }
                ]
            },
            react: {
                easy: [
                    {
                        question: "Create a React component that displays a counter with increment button.",
                        difficulty: "easy",
                        tags: ["state", "events"],
                        example: "Counter starts at 0, increments by 1 on button click",
                        options: [
                            "Use useState hook with onClick handler",
                            "Use useReducer for state management",
                            "Use class component with this.setState",
                            "Use useRef to store counter value"
                        ],
                        answer: "Use useState hook with onClick handler"
                    }
                ],
                medium: [
                    {
                        question: "Create a custom hook for managing form state with validation.",
                        difficulty: "medium",
                        tags: ["hooks", "forms", "state"],
                        example: "useForm({ name: required, email: email })",
                        options: [
                            "Use useState with validation functions",
                            "Use useReducer with validation actions",
                            "Use useCallback for memoized validators",
                            "Use useMemo for computed validation state"
                        ],
                        answer: "Use useState with validation functions"
                    }
                ],
                hard: [
                    {
                        question: "Implement a React component that debounces user input.",
                        difficulty: "medium",
                        tags: ["hooks", "performance", "debounce"],
                        example: "DebouncedInput with 300ms delay",
                        options: [
                            "Use useEffect with setTimeout cleanup",
                            "Use useMemo with dependency array",
                            "Use useCallback with debounce logic",
                            "Use custom hook with useRef timer"
                        ],
                        answer: "Use useEffect with setTimeout cleanup"
                    }
                ]
            }
        };

        const topicQuestions = mockQuestions[topic] || mockQuestions.javascript;
        const selectedQuestions = [];
        
        // Select questions based on difficulty
        let questionsPool = [];
        if (difficulty === 'mixed') {
            questionsPool = [
                ...topicQuestions.easy || [],
                ...topicQuestions.medium || [],
                ...topicQuestions.hard || []
            ];
        } else {
            questionsPool = topicQuestions[difficulty] || topicQuestions.easy || [];
        }
        
        // Generate a unique base timestamp for this batch to avoid ID conflicts
        const baseTimestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        
        for (let i = 0; i < count; i++) {
            const baseQuestion = questionsPool[i % questionsPool.length];
            selectedQuestions.push({
                ...baseQuestion,
                id: `${topic}_${difficulty}_mock_${baseTimestamp}_${randomSuffix}_${i}`,
                topic: topic,
                timestamp: new Date().toISOString()
            });
        }

        return selectedQuestions;
    }

    generatePrompt(topic, count, difficulty = 'mixed') {
        const difficultyText = difficulty === 'mixed' 
            ? 'a mix of easy, medium, and hard difficulties' 
            : `${difficulty} difficulty`;
            
        return `Generate ${count} coding interview questions for ${topic} with ${difficultyText}. 
        Each question should include 4 multiple choice options for approaches/solutions and specify the correct answer.
        Return ONLY a valid JSON array with this exact structure:
        [
            {
                "id": "unique_id",
                "question": "question text",
                "difficulty": "easy|medium|hard",
                "topic": "${topic}",
                "tags": ["tag1", "tag2"],
                "example": "code example if applicable",
                "options": [
                    "Option A: approach description",
                    "Option B: approach description", 
                    "Option C: approach description",
                    "Option D: approach description"
                ],
                "answer": "The correct option from the options array"
            }
        ]
        
        Make sure the JSON is valid and contains no additional text or formatting.`;
    }

    parseQuestions(content, topic) {
        try {
            // First, try to find and extract JSON array
            let jsonMatch = content.match(/\[[\s\S]*\]/);
            
            if (!jsonMatch) {
                // Try to find JSON object array pattern
                jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
            }
            
            if (!jsonMatch) {
                console.warn('⚠️  No valid JSON array found in response, returning empty array');
                return [];
            }
            
            let jsonString = jsonMatch[0];
            
            // Clean up common JSON formatting issues
            jsonString = jsonString
                .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
                .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
                .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double quotes
                .replace(/\n/g, ' ')  // Remove newlines
                .replace(/\r/g, ' ')  // Remove carriage returns
                .replace(/\t/g, ' ')  // Replace tabs with spaces
                .replace(/\s+/g, ' ')  // Normalize whitespace
                .trim();
            
            // Try to parse the cleaned JSON
            let questions;
            try {
                questions = JSON.parse(jsonString);
            } catch (parseError) {
                // If parsing still fails, try to fix more issues
                console.log('First parse failed, attempting to extract individual questions...');
                
                // Try to fix incomplete JSON by finding the last complete object
                const objects = [];
                let depth = 0;
                let currentObj = '';
                let inString = false;
                let escapeNext = false;
                
                for (let i = 1; i < jsonString.length - 1; i++) { // Skip outer brackets
                    const char = jsonString[i];
                    
                    if (escapeNext) {
                        escapeNext = false;
                        currentObj += char;
                        continue;
                    }
                    
                    if (char === '\\') {
                        escapeNext = true;
                        currentObj += char;
                        continue;
                    }
                    
                    if (char === '"' && !escapeNext) {
                        inString = !inString;
                    }
                    
                    if (!inString) {
                        if (char === '{') {
                            if (depth === 0) {
                                currentObj = '{';
                            } else {
                                currentObj += char;
                            }
                            depth++;
                        } else if (char === '}') {
                            depth--;
                            currentObj += char;
                            
                            if (depth === 0) {
                                try {
                                    const obj = JSON.parse(currentObj);
                                    objects.push(obj);
                                    currentObj = '';
                                } catch (e) {
                                    // Skip malformed object silently
                                    console.warn(`⚠️  Skipping malformed question object: ${e.message}`);
                                    currentObj = '';
                                }
                            }
                        } else if (depth > 0) {
                            currentObj += char;
                        }
                    } else {
                        currentObj += char;
                    }
                }
                
                if (objects.length === 0) {
                    console.warn('⚠️  Could not extract any valid question objects from response, returning empty array');
                    return [];
                }
                
                questions = objects;
            }
            
            if (!Array.isArray(questions)) {
                questions = [questions];
            }
            
            // Generate a unique base timestamp for this batch to avoid ID conflicts
            const baseTimestamp = Date.now();
            const randomSuffix = Math.random().toString(36).substring(2, 8);
            
            // Validate and enhance questions, filtering out invalid ones
            const validQuestions = questions
                .filter(q => {
                    if (!q || typeof q !== 'object' || !q.question) {
                        console.warn('⚠️  Skipping invalid question object:', q);
                        return false;
                    }
                    return true;
                })
                .map((q, index) => ({
                    id: q.id || `${topic}_${baseTimestamp}_${randomSuffix}_${index}`,
                    question: q.question || 'No question text provided',
                    difficulty: q.difficulty || 'medium',
                    topic: topic,
                    tags: Array.isArray(q.tags) ? q.tags : ['general'],
                    example: q.example || '',
                    options: Array.isArray(q.options) ? q.options : [],
                    answer: q.answer || '',
                    timestamp: new Date().toISOString()
                }));
            
            if (validQuestions.length === 0) {
                console.warn('⚠️  No valid questions found in response, returning empty array');
                return [];
            }
            
            console.log(`✅ Successfully parsed ${validQuestions.length} questions`);
            return validQuestions;
            
        } catch (error) {
            console.warn('⚠️  JSON parsing failed completely:', error.message);
            console.log('Raw content preview:', content.substring(0, 500) + '...');
            // Return empty array instead of throwing error
            return [];
        }
    }
}

async function fetchQuestions(topic, count = 5, difficulty = 'mixed') {
    const api = new DeepseekAPI();
    return await api.fetchQuestions(topic, count, difficulty);
}

module.exports = {
    DeepseekAPI,
    fetchQuestions
}; 