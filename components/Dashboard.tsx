
import React from 'react';
import { ProgressMetrics } from '../types';
import { GaugeIcon, TargetIcon, BookOpenIcon } from './icons';

const mockMetrics: ProgressMetrics = {
  grammar_score: 87,
  pronunciation_score: 92,
  fluency_score: 85,
  frequent_errors: ['Tense consistency', 'Article usage (a/an/the)'],
  lesson_suggested: ['Past Tense Drill', 'Using Articles Correctly'],
};

const ScoreCircle = ({ score, label }: { score: number, label: string }) => {
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (score / 100) * circumference;

    const colorClass = score > 85 ? 'text-green-400' : score > 60 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle
                        className="text-slate-700"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                    />
                    <circle
                        className={`${colorClass} transition-all duration-1000 ease-out`}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                        transform="rotate(-90 50 50)"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-2xl font-bold ${colorClass}`}>{score}</span>
                </div>
            </div>
            <p className="mt-2 text-sm text-slate-400">{label}</p>
        </div>
    );
};


const Dashboard: React.FC = () => {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 h-full border border-slate-700 shadow-lg flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GaugeIcon className="w-5 h-5 text-sky-400"/>
            Performance Metrics
        </h2>
        <p className="text-sm text-slate-400">Your progress based on recent sessions.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <ScoreCircle score={mockMetrics.grammar_score} label="Grammar"/>
        <ScoreCircle score={mockMetrics.pronunciation_score} label="Pronunciation"/>
        <ScoreCircle score={mockMetrics.fluency_score} label="Fluency"/>
      </div>
      
      <div className="bg-slate-900/50 p-4 rounded-lg">
        <h3 className="font-semibold text-white flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-yellow-400"/>
            Areas to Improve
        </h3>
        <ul className="mt-2 list-disc list-inside text-slate-300 text-sm space-y-1">
          {mockMetrics.frequent_errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>

      <div className="bg-slate-900/50 p-4 rounded-lg">
        <h3 className="font-semibold text-white flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-green-400"/>
            Suggested Lessons
        </h3>
         <ul className="mt-2 text-slate-300 text-sm space-y-1">
          {mockMetrics.lesson_suggested.map((lesson, index) => (
            <li key={index} className="flex items-center gap-2">
                <span className="bg-green-500/20 text-green-400 text-xs font-bold rounded-full px-2 py-0.5">NEW</span>
                <span>{lesson}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
