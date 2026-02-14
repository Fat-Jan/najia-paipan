#!/usr/bin/env python3
"""
Phase 1 Optimization Performance Benchmark
"""

import time
import sys
from pathlib import Path

# Add the najia module to Python path
sys.path.insert(0, str(Path(__file__).parent / 'najia'))

from najia import Najia

def benchmark_compile(iterations=1000):
    """Benchmark single compilation performance"""
    start_time = time.time()

    for _ in range(iterations):
        result = Najia().compile(
            params=[2, 2, 1, 2, 4, 2],
            date='2019-12-25 00:20'
        )

    end_time = time.time()
    avg_time = (end_time - start_time) / iterations

    print(f"=== Phase 1 Optimization Results ===")
    print(f"Iterations: {iterations}")
    print(f"Total time: {end_time - start_time:.4f} seconds")
    print(f"Average compilation time: {avg_time:.6f} seconds")
    print(f"Compilations per second: {1/avg_time:.1f}")

    return avg_time

def test_caching_effect():
    """Test the effectiveness of LRU caching"""
    print("\n=== Testing LRU Cache Effectiveness ===")

    # First run - cache miss
    start = time.time()
    for _ in range(100):
        Najia().compile(params=[2, 2, 1, 2, 4, 2], date='2019-12-25 00:20')
    first_run_time = time.time() - start

    # Second run - cache hit
    start = time.time()
    for _ in range(100):
        Najia().compile(params=[2, 2, 1, 2, 4, 2], date='2019-12-25 00:20')
    second_run_time = time.time() - start

    print(f"First 100 compilations (cache miss): {first_run_time:.4f}s")
    print(f"Next 100 compilations (cache hit): {second_run_time:.4f}s")
    print(f"Speedup from caching: {first_run_time/second_run_time:.2f}x")

if __name__ == "__main__":
    benchmark_compile(1000)
    test_caching_effect()