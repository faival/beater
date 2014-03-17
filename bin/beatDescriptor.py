#! /usr/bin/env python

import essentia, sys, os, numpy, json
from collections import defaultdict

# as there are 2 operating modes in essentia which have the same algorithms,
# these latter are dispatched into 2 submodules:

import essentia.standard
import essentia.streaming

from essentia.standard import *

lowLevelDesc = [
 'barkbands',
 'barkbands_kurtosis',
 'barkbands_skewness',
 'barkbands_spread',
 'hfc',
 'mfcc',
 'pitch',
 'pitch_instantaneous_confidence',
 'pitch_salience',
 'silence_rate_20dB',
 'silence_rate_30dB',
 'silence_rate_60dB',
 'spectral_complexity',
 'spectral_crest',
 'spectral_decrease',
 'spectral_energy',
 'spectral_energyband_low',
 'spectral_energyband_middle_low',
 'spectral_energyband_middle_high',
 'spectral_energyband_high',
 'spectral_flatness_db',
 'spectral_flux',
 'spectral_rms',
 'spectral_rolloff',
 'spectral_strongpeak',
 'zerocrossingrate',
 'inharmonicity',
 'tristimulus',
 'oddtoevenharmonicenergyratio',
 'logAttackTime' #only mean
 ]

targetDesc = [3, 16, 19, 20, 29]

def parse_args():


    print "parsing args"
    essentia_version = '%s\n'\
    'python version: %s\n'\
    'numpy version: %s' % (essentia.__version__,       # full version
                           sys.version.split()[0],     # python major version
                           numpy.__version__)          # numpy version

    from optparse import OptionParser
    parser = OptionParser(version=essentia_version)

    parser.add_option("--method",
                      action="store", dest="method", default="analyseRhythmFeatures",
                      help="just compute Beat Classess")


    (options, args) = parser.parse_args()

    print options
    print args

    return options, args




def processBeatClasses():

    beatInfoPath = args[0]+'.features/'
    beatHash = {}
    beatsFolder = os.listdir(beatInfoPath)
    percClasses = [ 'LOW','MLOW','MHI', 'HI']
    beatClassesByDesc = {}
    descriptorsMeans = {}




    #load pool files 
    for beatIndex in range(len(beatsFolder)):
        currentBPath = beatInfoPath+beatsFolder[beatIndex]
        beatPool = essentia.standard.YamlInput(filename=currentBPath)()

        beatHash[str(beatIndex)] = beatPool
    

    #get all means[0] and vars[0] in an array
    logAttackArray = []
    for beatIndex in range(len(beatsFolder)):
        logAttackArray.append(beatHash[str(beatIndex)]['logAttackTime.mean'])
        for beatDescriptorName in targetDesc:
            descName = lowLevelDesc[beatDescriptorName]
            computeDesc = ['mean', 'var']
            if descName == 'logAttackTime' :
                computeDesc.remove('var')

            for desc in computeDesc :
                floatDescriptor = beatHash[str(beatIndex)][descName+'.'+desc]
                if type(floatDescriptor) is list :
                    floatDescriptor = floatDescriptor[0]
                if beatIndex == 0 :
                    descriptorsMeans[descName+desc] = []
                descriptorsMeans[descName+desc].append(floatDescriptor)
        
        
    descGlobalMean = {}
    #get global means of all vars and means 
    for descName in descriptorsMeans.keys():
        descGlobalMean[descName] = numpy.mean(descriptorsMeans[descName])
        
           
    #compare each beat mean and var against its global and assign a class
    #assign the beat class that is most repeated per beat
    globalBeatClasses = {}
    for beatIndex in range(len(beatsFolder)-1) :
        beatClasses = []

        pruneDescriptors = [
            'spectral_energyband_lowmean',
            'spectral_energyband_highmean'
        ]



        beatDescLowMean = beatHash[str(beatIndex)]['spectral_energyband_low.mean'][0]
        globalDescLowMean =  descGlobalMean[pruneDescriptors[0]]

        beatDescHighMean = beatHash[str(beatIndex)]['spectral_energyband_high.mean'][0]
        globalDescHighMean =  descGlobalMean[pruneDescriptors[1]]

        pruneFactor = 3

        if (beatDescLowMean > globalDescLowMean) & (beatDescHighMean < globalDescHighMean) :
            for i in range(pruneFactor) :
                beatClasses.append(percClasses[0])
        elif (beatDescLowMean < globalDescLowMean) & (beatDescHighMean > globalDescHighMean) :
            for i in range(pruneFactor) :
                beatClasses.append(percClasses[0])

        for beatDescriptorName in targetDesc :
            descName = lowLevelDesc[beatDescriptorName]
            computeDesc = ['mean', 'var']
            if descName == 'logAttackTime' :
                computeDesc.remove('var')

            for desc in computeDesc :
                beatDescMean = beatHash[str(beatIndex)][descName+'.'+desc]
                targetDescMean = beatHash[str(beatIndex+1)][descName+'.'+desc]
                globalDescMean =  descGlobalMean[descName+desc]

                if type(beatDescMean) is float :
                    beatDescMean = [beatDescMean]
                    targetDescMean = [targetDescMean]

                beatDescMean = beatDescMean[0]
                targetDescMean = targetDescMean[0]


                if (beatDescMean > globalDescMean) & (beatDescMean > targetDescMean) : 
                    beatClass = percClasses[0]
                elif (beatDescMean < globalDescMean) & (beatDescMean > targetDescMean) :                 
                    beatClass = percClasses[1]
                elif (beatDescMean > globalDescMean) & (beatDescMean < targetDescMean) :
                    beatClass = percClasses[2]
                elif (beatDescMean < globalDescMean) & (beatDescMean < targetDescMean) :
                    beatClass = percClasses[3]

                beatClasses.append(beatClass)


        d = defaultdict(int)
        for beatClass in beatClasses:
            d[beatClass] += 1
        result = max(d.iteritems(), key=lambda x: x[1])

        globalBeatClasses[str(beatIndex)] = {}
        globalBeatClasses[str(beatIndex)]['class'] = result[0]
        globalBeatClasses[str(beatIndex)]['confidence'] = result[1]
        globalBeatClasses[str(beatIndex)]['logAttack'] = logAttackArray[beatIndex];
    print globalBeatClasses 

    beatClassFile = open(args[0]+'.beatclasses.json', 'w+')
    json.dump(globalBeatClasses, beatClassFile)



def processBeat(onsetIndex, beatAudio):

    w = Windowing(type = 'hann')
    spectrum = Spectrum()  # FFT() would return the complex FFT, here we just want the magnitude spectrum
    mfcc = MFCC()

    lowLevelSpectralEqLoud = essentia.standard.LowLevelSpectralExtractor(frameSize = 1024, hopSize = 512)
    logAttackTime = essentia.standard.LogAttackTime()

    pool = essentia.Pool()

    for frame in FrameGenerator(beatAudio, frameSize = 1024, hopSize = 512):
        #mfcc_bands, mfcc_coeffs = mfcc(spectrum(w(frame)))
        lowLevelCoef = lowLevelSpectralEqLoud(w(frame))
        for coeficientIndex in targetDesc:
            if "logAttackTime" not in lowLevelDesc[coeficientIndex] :
                pool.add(lowLevelDesc[coeficientIndex], lowLevelCoef[coeficientIndex])

    
    beatLogAttackTime = logAttackTime(beatAudio)
    pool.add("logAttackTime", beatLogAttackTime)

    print "#compute stats"                
    stats = ['mean', 'var']
    exceptions = {'logAttackTime': ['mean']}
    poolStats = essentia.standard.PoolAggregator(defaultStats=stats, exceptions=exceptions)(pool)
    beatInfoPath = args[0]+'.features/'+str(onsetIndex)+'.features'+'.json'    
    essentia.standard.YamlOutput(filename=beatInfoPath, format='json')(poolStats)
    return poolStats


def processRhythmDescriptors():
    print "# getting getRhythmDescriptors for "+args[0]
    os.system("python ./bin/rhythmdescriptors.py "+args[0]+" "+args[0]+".rhythm.json")


def processBeatDescriptors():
    print 'loading rhythm'
    rhythmPool = essentia.standard.YamlInput(filename=args[0]+".rhythm.json")()

    beatsDir = args[0]+'.features'
    if not os.path.exists(beatsDir):
        os.makedirs(beatsDir)

    print rhythmPool.descriptorNames()
    onsets = rhythmPool['beats_position']
    intervals = rhythmPool['bpm_intervals']
    
    audioPath = args[0].replace(".json", "")
    print 'loading ... '+audioPath
    loader = essentia.standard.EqloudLoader(filename=audioPath)
    print 'call loader(): '
    # and then we actually perform the loading:
    audio = loader()


    beatsInfo = {}
    for onsetIndex in range(len(onsets)):
        if onsetIndex > len(onsets) / 2:
            break
        startTime = onsets[onsetIndex]
        timeDiff = (intervals[onsetIndex] / 2)
        endTime = startTime + timeDiff

        beatAudio = audio[startTime*44100:endTime*44100]

        print '#processing from: '+str(startTime)+' to: '+str(endTime)
        print len(audio)
        processBeat(onsetIndex, beatAudio)

if __name__ == '__main__':

    opts, args = parse_args()
    
    if len(args) != 1:
        cmd = './'+os.path.basename(sys.argv[0])+ ' -h'
        os.system(cmd)
        print('not valid commands passed')
        sys.exit(1)


    print opts
    print args

    if opts.method == 'analyseRhythmFeatures':
        processRhythmDescriptors()
        processBeatDescriptors()
        processBeatClasses()
