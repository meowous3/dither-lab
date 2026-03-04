import { useState, useCallback } from 'react';
import { useDitherEngine } from './hooks/useDitherEngine';
import { Preview } from './components/Preview';
import { SourcePicker } from './components/SourcePicker';
import { GradientControls } from './components/GradientControls';
import { AlgorithmPicker } from './components/AlgorithmPicker';
import { TechniquePicker } from './components/TechniquePicker';
import { OutputControls } from './components/OutputControls';
import { DownloadBar } from './components/DownloadBar';
import { ColorPaletteEditor } from './components/ColorPaletteEditor';
import { PresetBar } from './components/PresetBar';

export function App() {
  const { state, result, rendering, update, updateGradient, uploadImage, clearImage } = useDitherEngine();
  const [locks, setLocks] = useState<Set<string>>(new Set());

  const toggleLock = useCallback((key: string) => {
    setLocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="app">
      <div className="panel-left">
        <Preview result={result} rendering={rendering} />
      </div>
      <div className="panel-right">
        <h1 className="app-title">webdither</h1>
        <SourcePicker
          sourceType={state.sourceType}
          imageName={state.imageName}
          imagePaletteMode={state.imagePaletteMode}
          onSelectGradient={clearImage}
          onUploadImage={uploadImage}
          onPaletteModeChange={(imagePaletteMode) => update({ imagePaletteMode })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <PresetBar
          sourceType={state.sourceType}
          locks={locks}
          currentGradient={state.gradient}
          onApply={(partial) => {
            update(partial);
          }}
        />
        {state.sourceType === 'gradient' && (
          <GradientControls
            gradient={state.gradient}
            onUpdate={updateGradient}
            locks={locks}
            toggleLock={toggleLock}
          />
        )}
        <AlgorithmPicker
          value={state.algorithm}
          onChange={(algorithm) => update({ algorithm })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <TechniquePicker
          value={state.ditherTechnique}
          directionAngle={state.directionAngle}
          onChange={(ditherTechnique) => update({ ditherTechnique })}
          onAngleChange={(directionAngle) => update({ directionAngle })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <OutputControls
          width={state.width}
          height={state.height}
          ditherScale={state.ditherScale}
          colorCount={state.colorCount}
          ditherStrength={state.ditherStrength}
          gammaCorrection={state.gammaCorrection}
          onUpdate={update}
          locks={locks}
          toggleLock={toggleLock}
        />
        <ColorPaletteEditor
          palette={state.palette}
          onUpdate={(palette) => update({ palette })}
          locks={locks}
          toggleLock={toggleLock}
        />
        <DownloadBar result={result} colorCount={state.colorCount} />
      </div>
    </div>
  );
}
