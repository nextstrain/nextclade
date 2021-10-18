#pragma once

namespace Nextclade {
  struct AnalysisResult;
  class TreeNode;
  enum class DivergenceUnits;

  double calculateDivergence(       //
    const TreeNode& nearestNode,    //
    const AnalysisResult& result,   //
    DivergenceUnits divergenceUnits,//
    int refSeqLength                //
  );
}//namespace Nextclade
