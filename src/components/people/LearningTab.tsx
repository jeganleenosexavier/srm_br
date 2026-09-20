'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Course } from '@/lib/courses';

interface EnrollmentWithCourse {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  enrolledAt: string;
  course: Course | null;
}

const STATUS_STYLES: Record<string, string> = {
  enrolled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
  enrolled: 'Enrolled',
  in_progress: 'In Progress',
  completed: 'Completed',
};

interface LearningTabProps {
  personId: string;
  isSelf: boolean;
}

export default function LearningTab({ personId, isSelf }: LearningTabProps) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/people/${personId}/enrollments`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEnrollments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [personId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Enrolled Courses</h3>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/6" />
              <div className="flex-1" />
              <div className="h-3 bg-gray-100 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Enrolled Courses</h3>

      {enrollments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-2">📖</span>
          <p className="text-sm text-gray-500 mb-3">No courses enrolled yet</p>
          {isSelf && (
            <button
              onClick={() => router.push('/lms')}
              className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2c5282] transition-colors"
            >
              Browse Courses
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Course</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Progress</th>
                  <th className="pb-2 font-medium">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {e.course && (
                          <div
                            className="w-1.5 h-6 rounded-full flex-shrink-0"
                            style={{ backgroundColor: e.course.color }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-800">
                            {e.course?.title || e.courseId}
                          </p>
                          {e.course && (
                            <p className="text-[10px] text-gray-400">
                              {e.course.provider}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs text-gray-500">
                        {e.course?.category || '—'}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          STATUS_STYLES[e.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[e.status] || e.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${e.progress}%`,
                              backgroundColor:
                                e.status === 'completed'
                                  ? '#10b981'
                                  : e.course?.color || '#1e3a5f',
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-8 text-right">
                          {e.progress}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-gray-400">
                      {new Date(e.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isSelf && (
            <div className="mt-4 pt-3 border-t border-gray-100 text-center">
              <button
                onClick={() => router.push('/lms')}
                className="text-xs text-[#1e3a5f] hover:underline"
              >
                Browse More Courses →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
