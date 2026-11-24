import { useState, useRef, useEffect, memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  aspectRatio?: string;
  sizes?: string;
  priority?: boolean;
}

const LazyImage = memo(({ 
  src, 
  alt, 
  className = '', 
  fallback = '/placeholder.svg',
  aspectRatio = 'aspect-square',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  // Generate optimized image sources
  const generateSources = (imageSrc: string) => {
    if (!imageSrc || imageSrc.includes('placeholder')) return null;
    
    const baseUrl = imageSrc.split('?')[0];
    const params = new URLSearchParams(imageSrc.split('?')[1] || '');
    
    return (
      <>
        <source 
          srcSet={`${baseUrl}?${params}&format=avif`} 
          type="image/avif" 
          sizes={sizes}
        />
        <source 
          srcSet={`${baseUrl}?${params}&format=webp`} 
          type="image/webp" 
          sizes={sizes}
        />
      </>
    );
  };

  if (!isInView) {
    return (
      <div 
        ref={imgRef} 
        className={`${aspectRatio} ${className} overflow-hidden`}
      >
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className={`${aspectRatio} ${className} overflow-hidden relative group`}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full animate-pulse" />
      )}
      
      <picture className="w-full h-full">
        {generateSources(hasError ? fallback : src)}
        <img
          ref={imgRef}
          src={hasError ? fallback : src}
          alt={alt}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          } group-hover:scale-110`}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        
        {/* Overlay de loading animado */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
      </picture>
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;