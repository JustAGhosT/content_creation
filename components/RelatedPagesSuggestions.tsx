import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Suggestion {
  title: string;
  path: string;
  relevance?: number;
}

interface RelatedPagesSuggestionsProps {
  currentPath: string;
  maxSuggestions?: number;
}

const RelatedPagesSuggestions: React.FC<RelatedPagesSuggestionsProps> = ({ 
  currentPath, 
  maxSuggestions = 3 
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        setIsLoading(true);
        
        // In a real application, you might call an API to get suggestions
        // based on the current path. Here we'll simulate that with some
        // hard-coded suggestions based on path segments.
        
        // Extract path segments to use for matching
        const pathSegments = currentPath
          .split('/')
          .filter(segment => segment)
          .map(segment => segment.toLowerCase());
        
        // Define all available pages
        const allPages: Suggestion[] = [
          { title: 'Home', path: '/' },
          { title: 'Workflow', path: '/workflow' },
          { title: 'Automation', path: '/automation' },
          { title: 'Content Adaptation', path: '/content-adaptation' },
          { title: 'Human Review', path: '/human-review' },
          { title: 'Series', path: '/series' },
          { title: 'Platform Analysis', path: '/platform-analysis' },
          { title: 'Performance Dashboard', path: '/performance-dashboard' }
        ];
        
        // Calculate relevance based on path segments
        const suggestionsWithRelevance = allPages.map(page => {
          const pageSegments = page.path
            .split('/')
            .filter(segment => segment)
            .map(segment => segment.toLowerCase());
          
          // Calculate a simple relevance score based on matching segments
          let relevance = 0;
          
          // Don't suggest the current page
          if (page.path === currentPath) {
            return { ...page, relevance: -1 };
          }
          
          // Check for segment matches
          pathSegments.forEach(segment => {
            if (pageSegments.includes(segment)) {
              relevance += 1;
            }
            
            // Check for partial matches too
            pageSegments.forEach(pageSegment => {
              if (pageSegment.includes(segment) || segment.includes(pageSegment)) {
                relevance += 0.5;
              }
            });
          });
          
          return { ...page, relevance };
        });
        
        // Sort by relevance and take top N
        const topSuggestions = suggestionsWithRelevance
          .filter(page => page.relevance > 0)
          .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
          .slice(0, maxSuggestions);
        
        // If we don't have enough relevant suggestions, add some default ones
        if (topSuggestions.length < maxSuggestions) {
          const defaultSuggestions = suggestionsWithRelevance
            .filter(page => page.relevance !== -1 && !topSuggestions.includes(page))
            .sort(() => 0.5 - Math.random()) // Shuffle
            .slice(0, maxSuggestions - topSuggestions.length);
          
          topSuggestions.push(...defaultSuggestions);
        }
        
        setSuggestions(topSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        // Provide fallback suggestions
        setSuggestions([
          { title: 'Home', path: '/' },
          { title: 'Workflow', path: '/workflow' },
          { title: 'Content Adaptation', path: '/content-adaptation' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [currentPath, maxSuggestions]);

  if (isLoading) {
    return <div className="suggestions-loading">Finding related pages...</div>;
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="related-suggestions">
      <h3 className="text-lg font-medium text-gray-900 mb-4">You might also be interested in:</h3>
      <ul className="grid gap-3">
        {suggestions.map((suggestion, index) => (
          <li key={index} className="border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow">
            <Link 
              href={suggestion.path}
              className="block p-4 text-indigo-600 hover:bg-indigo-50"
            >
              {suggestion.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RelatedPagesSuggestions;