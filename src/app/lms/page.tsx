'use client';

import { useState, useEffect } from 'react';
import { COURSE_CATEGORIES } from '@/lib/courses';
import type { Course } from '@/lib/courses';

interface CourseWithEnrollment extends Course {
  enrollment: { status: string; progress: number } | null;
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

const LEVEL_STYLES: Record<string, string> = {
  Beginner: 'bg-green-50 text-green-700',
  Intermediate: 'bg-blue-50 text-blue-700',
  Advanced: 'bg-purple-50 text-purple-700',
};

export default function LmsPage() {
  const [courses, setCourses] = useState<CourseWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [selectedCourse, setSelectedCourse] = useState<CourseWithEnrollment | null>(null);
  const [canEnroll, setCanEnroll] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        setCanEnroll(!!d.user?.personId);
      })
      .catch(() => {});

    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/lms/courses');
      if (res.ok) {
        setCourses(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setActionLoading(true);
    const res = await fetch('/api/lms/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    });
    if (res.ok) {
      await fetchCourses();
      const updated = courses.find((c) => c.id === courseId);
      if (updated) {
        setSelectedCourse({
          ...updated,
          enrollment: { status: 'enrolled', progress: 0 },
        });
      }
    }
    setActionLoading(false);
  };

  const handleUpdateProgress = async (courseId: string, progress: number) => {
    setActionLoading(true);
    const status = progress === 100 ? 'completed' : 'in_progress';
    const res = await fetch('/api/lms/enroll', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId, progress, status }),
    });
    if (res.ok) {
      await fetchCourses();
      setSelectedCourse((prev) =>
        prev ? { ...prev, enrollment: { status, progress } } : null
      );
    }
    setActionLoading(false);
  };

  const filtered =
    filter === 'All' ? courses : courses.filter((c) => c.category === filter);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Learning Center</h2>
        <p className="text-sm text-gray-500 mb-6">Browse courses to skill up</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-2 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-2 bg-gray-100 rounded w-full mb-2" />
              <div className="h-2 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Learning Center</h2>
      <p className="text-sm text-gray-500 mb-6">Browse courses to skill up</p>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['All', ...COURSE_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-4xl mb-3">📚</span>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">No courses found</h3>
          <p className="text-sm text-gray-500">Try a different category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course)}
              className="bg-white rounded-xl border border-gray-200 p-0 text-left hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Color accent bar */}
              <div className="h-1.5" style={{ backgroundColor: course.color }} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-800 leading-tight">
                    {course.title}
                  </h3>
                  {course.enrollment && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${
                        STATUS_STYLES[course.enrollment.status]
                      }`}
                    >
                      {STATUS_LABELS[course.enrollment.status]}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 mb-3">{course.provider}</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {course.category}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded ${LEVEL_STYLES[course.level]}`}
                  >
                    {course.level}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                    {course.duration}
                  </span>
                </div>

                {/* Skill pills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {course.skills.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-200 text-gray-600"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Progress bar for enrolled courses */}
                {course.enrollment && course.enrollment.progress > 0 && (
                  <div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${course.enrollment.progress}%`,
                          backgroundColor:
                            course.enrollment.status === 'completed'
                              ? '#10b981'
                              : course.color,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {course.enrollment.progress}% complete
                    </p>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedCourse(null)}
        >
          <div
            className="bg-white rounded-xl p-0 max-w-lg w-full mx-4 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color bar */}
            <div
              className="h-2"
              style={{ backgroundColor: selectedCourse.color }}
            />

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedCourse.title}
                </h3>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
                >
                  &times;
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-gray-500">
                <span>{selectedCourse.provider}</span>
                <span className="text-gray-300">&middot;</span>
                <span>{selectedCourse.category}</span>
                <span className="text-gray-300">&middot;</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded ${
                    LEVEL_STYLES[selectedCourse.level]
                  }`}
                >
                  {selectedCourse.level}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-1">
                Duration: {selectedCourse.duration}
              </p>

              <p className="text-sm text-gray-700 mt-3 mb-4">
                {selectedCourse.description}
              </p>

              {/* Related Skills */}
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-1.5">
                  Related Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCourse.skills.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action area */}
              {!canEnroll ? (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
                  Enrollment is available for interns and mentors.
                </p>
              ) : !selectedCourse.enrollment ? (
                <button
                  onClick={() => handleEnroll(selectedCourse.id)}
                  disabled={actionLoading}
                  className="w-full bg-[#1e3a5f] text-white py-2.5 rounded-lg font-medium text-sm hover:bg-[#2c5282] disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Enrolling...' : 'Enroll Now'}
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Status + Progress */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        STATUS_STYLES[selectedCourse.enrollment.status]
                      }`}
                    >
                      {STATUS_LABELS[selectedCourse.enrollment.status]}
                    </span>
                    <span className="text-sm text-gray-600 font-medium">
                      {selectedCourse.enrollment.progress}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${selectedCourse.enrollment.progress}%`,
                        backgroundColor:
                          selectedCourse.enrollment.status === 'completed'
                            ? '#10b981'
                            : selectedCourse.color,
                      }}
                    />
                  </div>

                  {/* Progress buttons */}
                  {selectedCourse.enrollment.status !== 'completed' && (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Update progress:</p>
                      <div className="flex gap-2">
                        {[25, 50, 75, 100].map((p) => (
                          <button
                            key={p}
                            onClick={() =>
                              handleUpdateProgress(selectedCourse.id, p)
                            }
                            disabled={
                              actionLoading ||
                              p <= (selectedCourse.enrollment?.progress ?? 0)
                            }
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              p <= (selectedCourse.enrollment?.progress ?? 0)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {p}%
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateProgress(selectedCourse.id, 100)
                        }
                        disabled={actionLoading}
                        className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? 'Updating...' : 'Mark Complete'}
                      </button>
                    </div>
                  )}

                  {selectedCourse.enrollment.status === 'completed' && (
                    <p className="text-xs text-emerald-600 text-center py-2">
                      ✓ You have completed this course
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
