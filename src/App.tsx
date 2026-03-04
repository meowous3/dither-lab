import { useDitherEngine } from './hooks/useDitherEngine';
import { Preview } from './components/Preview';
import { GradientControls } from './components/GradientControls';
import { AlgorithmPicker } from './components/AlgorithmPicker';
import { OutputControls } from './components/OutputControls';
import { DownloadBar } from './components/DownloadBar';
import { ColorPaletteEditor } from './components/ColorPaletteEditor';
import { PresetBar } from './components/PresetBar';

export function App() {
  const { state, result, rendering, update, updateGradient } = useDitherEngine();

  return (
    <div className="app">
      <div className="panel-left">
        <Preview result={result} rendering={rendering} />
      </div>
      <div className="panel-right">
        <h1 className="app-title">webdither</h1>
        <PresetBar
          onApply={(partial) => {
            // Apply all preset fields including gradient
            update(partial);
          }}
        />
        <GradientControls gradient={state.gradient} onUpdate={updateGradient} />
        <AlgorithmPicker
          value={state.algorithm}
          onChange={(algorithm) => update({ algorithm })}
        />
        <OutputControls
          width={state.width}
          height={state.height}
          ditherScale={state.ditherScale}
          colorCount={state.colorCount}
          onUpdate={update}
        />
        <ColorPaletteEditor
          palette={state.palette}
          onUpdate={(palette) => update({ palette })}
        />
        <DownloadBar result={result} colorCount={state.colorCount} />
      </div>
    </div>
  );
}
