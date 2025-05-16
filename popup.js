document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("searchForm");
    const selectAll = document.getElementById("selectAll");
    const resultContainer = document.getElementById("results");
    const standardCheckboxes = document.querySelectorAll("input[name='standards']");
  
    // Handle "Select All" checkbox
    selectAll.addEventListener("change", () => {
        standardCheckboxes.forEach(checkbox => checkbox.checked = selectAll.checked);
    });
  
    // Update "Select All" when individual checkboxes change
    standardCheckboxes.forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            selectAll.checked = Array.from(standardCheckboxes).every(cb => cb.checked);
        });
    });
  
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const subject = document.getElementById("subject").value;
        const selectedStandards = Array.from(document.querySelectorAll("input[name='standards']:checked"))
            .map(cb => cb.value);
        const keywords = document.getElementById("keywords").value.trim();
        const questionType = document.querySelector("input[name='questionType']:checked");
  
        // Validation
        if (!subject) {
            showError("Please select a subject");
            return;
        }
        if (selectedStandards.length === 0) {
            showError("Please select at least one standard");
            return;
        }
        if (!keywords) {
            showError("Please enter keywords");
            return;
        }
        if (!questionType) {
            showError("Please select a question type");
            return;
        }
  
        const type = questionType.value;
        showLoading();
  
        try {
            const prompt = generatePrompt(subject, selectedStandards, keywords, type);
            const response = await fetchQuestion(prompt);
            
            if (response.error) {
                throw new Error(response.error);
            }
  
            const output = formatOutput(response);
            showResults(output);
        } catch (error) {
            console.error('Error:', error);
            showError("Failed to generate question. Please try again later.");
        }
    });
});
  
function showLoading() {
    const resultContainer = document.getElementById("results");
    resultContainer.innerHTML = `
        <div class="loading">
            <p>Generating question...</p>
            <div class="spinner"></div>
        </div>
    `;
    resultContainer.classList.add('active');
}
  
function showError(message) {
    const resultContainer = document.getElementById("results");
    resultContainer.innerHTML = `<div class="error">${message}</div>`;
    resultContainer.classList.add('active');
}
  
function showResults(output) {
    const resultContainer = document.getElementById("results");
    resultContainer.innerHTML = `
        <div class="result-content">
            ${output}
        </div>
    `;
    resultContainer.classList.add('active');
}
  
function generatePrompt(subject, standards, keywords, type) {
    const questionType = type.toUpperCase();
    
    return `You are an expert ${subject.toUpperCase()} teacher. Generate 24 ${questionType} questions following these requirements exactly:

CONTEXT:
- Subject: ${subject.toUpperCase()}
- Educational Standards: ${standards.join(", ")}
- Topic: ${keywords}
- Question Type: ${questionType}
- Number of Questions: 24

First, identify the specific chapter from ${subject} curriculum that contains '${keywords}'.

Chapter Name: [Specify the exact chapter name from ${subject} curriculum that covers ${keywords}]

Then generate 24 questions in this format:

Question 1:
[Write a clear, detailed question about ${keywords}]

Answer 1:
[Provide a detailed, step-by-step solution with explanations]

Question 2:
[Write a different question about ${keywords}]

Answer 2:
[Provide a detailed, step-by-step solution with explanations]

Question 3:
[Write a clear, detailed question about ${keywords}]

Answer 3:
[Provide a detailed, step-by-step solution with explanations]

Question 4:
[Write a different question about ${keywords}]

Answer 4:
[Provide a detailed, step-by-step solution with explanations]

Question 5:
[Write a clear, detailed question about ${keywords}]

Answer 5:
[Provide a detailed, step-by-step solution with explanations]

Question 6:
[Continue this pattern for all 24 questions...]

Question 7:
[Write a clear, detailed question about ${keywords}]

Answer 7:
[Provide a detailed, step-by-step solution with explanations]

Question 8:
[Write a different question about ${keywords}]

Answer 8:
[Provide a detailed, step-by-step solution with explanations]

Question 9:
[Write a clear, detailed question about ${keywords}]

Answer 9:
[Provide a detailed, step-by-step solution with explanations]

Question 10:
[Write a clear, detailed question about ${keywords}]

Answer 10:
[Provide a detailed, step-by-step solution with explanations]

Important Guidelines:
1. Each question should be unique and cover different aspects of ${keywords}
2. Include numerical problems where applicable
3. Include theoretical concepts
4. Provide detailed step-by-step solutions
5. Include relevant formulas and explanations in answers
6. Make questions progressively more challenging

At the end, provide:

Related Concepts:
- [List key concepts covered in these questions]
- [Include important formulas]
- [Mention related topics from the same chapter]

Please ensure all 24 questions are provided with complete answers.`;
}
  
async function fetchQuestion(prompt) {
    const API_KEY = 'RfJJrcd2O414o3MDEch2JlWdzzRoWC6uYpDBpjB5';
    
    try {
        const response = await fetch("https://api.cohere.ai/v1/generate", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                model: "command",
                prompt: prompt,
                max_tokens: 10000,
                temperature: 0.7,
                k: 0,
                stop_sequences: [],
                return_likelihoods: "NONE"
            })
        });
  
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
        return data.generations?.[0]?.text || null;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
  
function formatOutput(text) {
    if (!text) return '<p class="error">No response received from the AI.</p>';
    
    // Split the text into main sections
    const [chapterSection, ...questionSections] = text.split('\n\nQuestion');
    
    // Format chapter section - extract chapter name if available
    let chapterName = "";
    let chapterContent = chapterSection;
    
    const chapterNameMatch = chapterSection.match(/Chapter Name:(.*?)(?:\n|$)/);
    if (chapterNameMatch && chapterNameMatch[1]) {
        chapterName = chapterNameMatch[1].trim();
        chapterContent = chapterSection.replace(/Chapter Name:.*?(?:\n|$)/, '').trim();
    }
    
    let formatted = `
        <div class="section chapter-section">
            ${chapterName ? `<h3>${chapterName}</h3>` : ''}
            <div class="content">${chapterContent}</div>
        </div>
        <div class="questions-container">
    `;
    
    // Format each question-answer pair
    questionSections.forEach((section, index) => {
        if (!section.trim()) return;
        
        const [question, ...answerParts] = section.split('\n\nAnswer');
        const questionNumber = index + 1;
        const answer = answerParts.join('\n\nAnswer'); // Rejoin in case answer contains multiple parts
        
        formatted += `
            <div class="question-answer-pair" id="question-${questionNumber}">
                <div class="question-section">
                    <h3>Question ${questionNumber}</h3>
                    <div class="content">${question.replace(/^\d+:/, '').trim()}</div>
                </div>
                <div class="answer-section">
                    <h3>Answer</h3>
                    <div class="solution">
                        ${answer.replace(/^\d+:/, '').trim().split('\n').map(line => 
                            `<p>${line.trim()}</p>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    });
    
    // Add related concepts section if it exists
    const relatedConceptsMatch = text.match(/Related Concepts:\n([\s\S]*?)$/);
    if (relatedConceptsMatch) {
        formatted += `
            <div class="section concepts-section">
                <h3>Related Concepts</h3>
                <ul class="related-topics">
                    ${relatedConceptsMatch[1].split('\n').map(concept => {
                        concept = concept.trim();
                        return concept ? `<li>${concept.replace(/^-\s*/, '').trim()}</li>` : '';
                    }).join('')}
                </ul>
            </div>
        `;
    }
    
    // Add YouTube recommendations section
    const subject = document.getElementById("subject").value;
    const keywords = document.getElementById("keywords").value.trim();
    const searchTerms = `${subject} ${keywords} tutorial`;
    
    formatted += `
        <div class="section youtube-section">
            <h3>Recommended Videos</h3>
            <div class="video-container">
                <div class="video-info">
                    <div class="video-thumbnail">
                        <img src="https://via.placeholder.com/120x90/cccccc/666666?text=Loading..." alt="Video thumbnail">
                        <div class="play-button">▶</div>
                    </div>
                    <div class="video-details">
                        <h4>Educational Videos on ${chapterName || keywords}</h4>
                        <p>Click below to search YouTube for related videos</p>
                        <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms)}" target="_blank" class="youtube-link">
                            Search on YouTube
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    formatted += `</div>`;

    return `
        <div class="formatted-result">
            ${formatted}
            <div class="footer">
                <small>Generated by Notes Finder</small>
            </div>
        </div>`;
}
  