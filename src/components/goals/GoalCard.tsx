"use client";

import React, { useState } from "react";

// Use types compatible with what getGoals returns
interface Resource {
    id: string;
    title: string;
    url: string;
}

interface Step {
    id: string;
    description: string;
    order: string;
    isCompleted: boolean;
    isUserDefined: boolean;
    resources: Resource[];
}

interface Goal {
    id: string;
    title: string;
    targetAmount: string | null;
    currentAmount: string | null;
    steps: Step[];
    status: string;
}

interface GoalCardProps {
    goal: Goal;
}

export default function GoalCard({ goal }: GoalCardProps) {
    const target = Number(goal.targetAmount) || 0;
    const current = Number(goal.currentAmount) || 0;
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

    // Steps sorted by order
    const sortedSteps = [...goal.steps].sort((a, b) => Number(a.order) - Number(b.order));

    // Default active step (first not completed)
    const activeStepIndex = sortedSteps.findIndex(s => !s.isCompleted);
    const defaultStepIndex = activeStepIndex === -1 ? sortedSteps.length - 1 : activeStepIndex;

    // Selected step state - defaults to active step
    const [selectedStepIndex, setSelectedStepIndex] = useState<number>(defaultStepIndex);
    const selectedStep = sortedSteps[selectedStepIndex];

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-gray-900/5 p-6">
            {/* Header */}
            <h3 className="text-base font-bold text-gray-900 mb-6">{goal.title}</h3>

            {/* Stepper */}
            {sortedSteps.length > 0 && (
                <div className="relative mb-8">
                    <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 rounded-full" />
                    <div className="relative flex justify-between">
                        {sortedSteps.map((step, idx) => (
                            <div key={step.id} className="relative group">
                                <div
                                    onClick={() => setSelectedStepIndex(idx)}
                                    className={`w-4 h-4 rounded-full border-2 z-10 cursor-pointer transition-all duration-200
                                        ${idx === selectedStepIndex
                                            ? 'bg-fuchsia-500 border-fuchsia-500 ring-2 ring-fuchsia-200'
                                            : step.isCompleted
                                                ? 'bg-emerald-500 border-emerald-500'
                                                : 'bg-white border-gray-200 hover:border-gray-400'}`}
                                />
                                {/* Tooltip - positioned based on step location */}
                                <div className={`absolute bottom-full mb-2 
                                                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                                bg-gray-800 text-white text-xs rounded-lg px-3 py-2 
                                                whitespace-nowrap pointer-events-none z-20 shadow-lg
                                                ${idx === 0 ? 'left-0' :
                                        idx === sortedSteps.length - 1 ? 'right-0' :
                                            'left-1/2 -translate-x-1/2'}`}>
                                    <div className="font-semibold">Step {idx + 1}</div>
                                    <div className="text-gray-300">{step.description}</div>
                                    {step.isUserDefined && <div className="text-blue-400 mt-1">📌 Your step</div>}
                                    {step.isCompleted && <div className="text-green-400 mt-1">✓ Completed</div>}
                                    {/* Arrow - positioned to match tooltip */}
                                    <div className={`absolute top-full border-4 border-transparent border-t-gray-800
                                                    ${idx === 0 ? 'left-2' :
                                            idx === sortedSteps.length - 1 ? 'right-2' :
                                                'left-1/2 -translate-x-1/2'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedStep && (
                <div className="text-sm font-medium text-gray-700 mb-6">
                    Step {selectedStepIndex + 1}: {selectedStep.description}
                    {selectedStep.isUserDefined && <span className="ml-2 text-blue-500">📌</span>}
                </div>
            )}

            {/* Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Financial Target Box */}
                <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                    <div className="text-sm font-semibold text-gray-900 mb-4">Financial target for this goal</div>

                    <div className="flex justify-between items-end mb-2">
                        <div className="text-xs text-gray-500">Total amount</div>
                        <div className="text-xs text-gray-500 text-right">
                            Left to save<br />
                            <span className="font-bold text-gray-900">${(Math.max(target - current, 0)).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="text-3xl font-bold text-gray-900 mb-2">${target.toLocaleString()}</div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-1">Saved {Math.round(progress)}% of ${target.toLocaleString()}</div>
                </div>

                {/* Resources Box - shows selected step's resources */}
                {selectedStep && selectedStep.resources.length > 0 && (
                    <div className="border border-gray-100 rounded-lg p-4 bg-white">
                        <div className="text-sm font-semibold text-gray-900 mb-2">Resources for Step {selectedStepIndex + 1}</div>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                            {selectedStep.resources.map(res => (
                                <li key={res.id}>
                                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                        {res.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {selectedStep && selectedStep.resources.length === 0 && (
                    <div className="border border-gray-100 rounded-lg p-4 bg-white">
                        <div className="text-sm font-semibold text-gray-900 mb-2">Resources for Step {selectedStepIndex + 1}</div>
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                            <svg className="animate-spin h-4 w-4 text-fuchsia-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Curating resources for this step...
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

