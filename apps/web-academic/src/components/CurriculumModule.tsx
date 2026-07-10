import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Layers, ShieldCheck } from 'lucide-react';
import './CurriculumModule.css';

interface Prerequisite {
  id: number;
  code: string;
  name: string;
}

interface Subject {
  id: number;
  code: string;
  name: string;
  description: string;
  prerequisites: Prerequisite[];
}

interface Semester {
  id: number;
  name: string;
  level: number;
  subjects: Subject[];
}

interface ArrowPath {
  id: string;
  d: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CurriculumModule: React.FC<{ token: string | null }> = ({ token }) => {
  const [curriculum, setCurriculum] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [arrows, setArrows] = useState<ArrowPath[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_URL}/academic/curriculum`, { headers });
        if (!res.ok) throw new Error('Error al obtener la malla curricular');

        const data = await res.json();
        setCurriculum(data);
      } catch (err: any) {
        setError(err.message || 'Error de conexión');
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, [token]);

  // SVG Arrow calculation
  useEffect(() => {
    const drawArrows = () => {
      if (!containerRef.current || curriculum.length === 0) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newArrows: ArrowPath[] = [];

      curriculum.forEach(semester => {
        semester.subjects.forEach(subject => {
          subject.prerequisites.forEach(pr => {
            const startEl = document.getElementById(`subject-${pr.id}`);
            const endEl = document.getElementById(`subject-${subject.id}`);
            
            if (startEl && endEl) {
              const startRect = startEl.getBoundingClientRect();
              const endRect = endEl.getBoundingClientRect();
              
              const startX = (startRect.right - containerRect.left) + containerRef.current!.scrollLeft;
              const startY = (startRect.top - containerRect.top) + (startRect.height / 2);
              
              const endX = (endRect.left - containerRect.left) + containerRef.current!.scrollLeft;
              const endY = (endRect.top - containerRect.top) + (endRect.height / 2);
              
              const cpX1 = startX + 50;
              const cpY1 = startY;
              const cpX2 = endX - 50;
              const cpY2 = endY;
              
              const d = `M ${startX} ${startY} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${endX} ${endY}`;
              newArrows.push({ id: `${pr.id}-${subject.id}`, d });
            }
          });
        });
      });
      
      setArrows(newArrows);
    };

    // Draw initially
    setTimeout(drawArrows, 100);

    // Redraw on window resize
    window.addEventListener('resize', drawArrows);
    return () => window.removeEventListener('resize', drawArrows);
  }, [curriculum]);

  if (loading) {
    return (
      <div className="curriculum-loader">
        <div className="spinner"></div>
        <p>Cargando Malla Curricular...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="curriculum-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="curriculum-container">
      <div className="curriculum-header">
        <div className="header-icon-wrapper">
          <BookOpen size={28} className="header-icon" />
        </div>
        <div>
          <h2>Malla Curricular Oficial</h2>
          <p>Sistemas de Información (R2013) - Facultad de Ingeniería y Ciencias Aplicadas</p>
        </div>
      </div>

      <div 
        className="curriculum-grid" 
        ref={containerRef} 
        style={{ position: 'relative' }}
        onScroll={() => {
           // We might not need to redraw if the SVG scrolls with the content
           // But since SVG is absolute, it will scroll together if we put it inside a scrolling container correctly
        }}
      >
        <svg 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            pointerEvents: 'none', 
            zIndex: 10,
            overflow: 'visible'
          }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>
          {arrows.map(arrow => (
            <path
              key={arrow.id}
              d={arrow.d}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
              opacity="0.6"
            />
          ))}
        </svg>

        {curriculum.map((semester) => (
          <div key={semester.id} className="semester-column">
            <div className="semester-title">
              <Layers size={18} />
              <span>Nivel {semester.level}</span>
            </div>
            
            <div className="subjects-list">
              {semester.subjects.map((subject) => (
                <div key={subject.id} id={`subject-${subject.id}`} className="subject-card">
                  <div className="subject-code">{subject.code}</div>
                  <h4 className="subject-name">{subject.name}</h4>
                  
                  {subject.prerequisites.length > 0 && (
                    <div className="prerequisites-section">
                      <div className="prereq-label"><ShieldCheck size={12}/> Prerrequisitos:</div>
                      <div className="prereq-badges">
                        {subject.prerequisites.map(pr => (
                          <span key={pr.id} className="prereq-badge" title={pr.name}>
                            {pr.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CurriculumModule;
