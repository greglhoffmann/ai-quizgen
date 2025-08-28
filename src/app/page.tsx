/**
 * Home page (client component)
 * - Renders the topic form and, once generated, the quiz runner.
 * - Keeps minimal state: the current quiz and any error message.
 */
'use client';

import TopicForm from '@/components/TopicForm';
import QuizRunner from '@/components/QuizRunner';
import { useState } from 'react';
import ErrorMessage from '@/components/ErrorMessage';

export default function HomePage() {
  const [quiz, setQuiz] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <TopicForm onLoaded={setQuiz} onError={(msg) => setError(msg)} />
  {error && <ErrorMessage>{error}</ErrorMessage>}
      {quiz && <QuizRunner quiz={quiz} />}
    </div>
  );
}
