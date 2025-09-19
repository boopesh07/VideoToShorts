"use client";

import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
	errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Log error to console or error reporting service
		console.error("ErrorBoundary caught an error:", error, errorInfo);
		this.setState({ error, errorInfo });
	}

	render() {
		if (this.state.hasError) {
			// Custom fallback UI
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Default error UI
			return (
				<div className="min-h-screen flex items-center justify-center bg-gray-50">
					<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
						<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
							<svg
								className="w-8 h-8 text-red-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
								/>
							</svg>
						</div>

						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Something went wrong
						</h2>

						<p className="text-gray-600 mb-6">
							We encountered an unexpected error. Please try refreshing the page
							or contact support if the problem persists.
						</p>

						<div className="space-y-3">
							<button
								onClick={() => window.location.reload()}
								className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
							>
								Refresh Page
							</button>

							<button
								onClick={() => this.setState({ hasError: false })}
								className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
							>
								Try Again
							</button>
						</div>

						{process.env.NODE_ENV === "development" && this.state.error && (
							<details className="mt-6 text-left">
								<summary className="cursor-pointer text-sm font-medium text-gray-700">
									Error Details (Development)
								</summary>
								<div className="mt-2 p-4 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
									<pre>{this.state.error.toString()}</pre>
									{this.state.errorInfo && (
										<pre>{this.state.errorInfo.componentStack}</pre>
									)}
								</div>
							</details>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

// Hook version for functional components
import { useState, useEffect } from "react";

interface ErrorFallbackProps {
	error: Error;
	resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
				<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<svg
						className="w-8 h-8 text-red-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
						/>
					</svg>
				</div>

				<h2 className="text-2xl font-bold text-gray-900 mb-4">
					Something went wrong
				</h2>

				<p className="text-gray-600 mb-6">
					We encountered an unexpected error. Please try again or contact
					support if the problem persists.
				</p>

				<div className="space-y-3">
					<button
						onClick={resetError}
						className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
					>
						Try Again
					</button>

					<button
						onClick={() => window.location.reload()}
						className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors font-medium"
					>
						Refresh Page
					</button>
				</div>

				{process.env.NODE_ENV === "development" && (
					<details className="mt-6 text-left">
						<summary className="cursor-pointer text-sm font-medium text-gray-700">
							Error Details (Development)
						</summary>
						<div className="mt-2 p-4 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
							<pre>{error.toString()}</pre>
						</div>
					</details>
				)}
			</div>
		</div>
	);
}

export default ErrorBoundary;
