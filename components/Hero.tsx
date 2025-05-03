import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1>Welcome to Our Website</h1>
        <p>Your journey to technical excellence starts here.</p>
        <a href="/series" className="hero-button">Explore Series</a>
      </div>
    </section>
  );
};

export default Hero;