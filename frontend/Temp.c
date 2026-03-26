#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAXV 100
#define MAXE 500
#define MAXPATH 200
#define MAXLEN 50
#define MAXTIME 10000

typedef struct {
    int to;
    int weight;
} Edge;

typedef struct {
    Edge edges[MAXE];
    int edgeCount;
} AdjList;

typedef struct {
    int nodes[MAXLEN];
    int length;
    int entryTime;
} Path;

typedef struct {
    int time;
    int direction;
    int used;
} SignalSlot;

AdjList graph[MAXV];
SignalSlot schedule[MAXV][MAXTIME];

Path paths[MAXPATH];

int V, K;

void addEdge(int u, int v, int w)
{
    graph[u].edges[graph[u].edgeCount].to = v;
    graph[u].edges[graph[u].edgeCount].weight = w;
    graph[u].edgeCount++;
}

int getWeight(int u, int v)
{
    for(int i=0;i<graph[u].edgeCount;i++)
    {
        if(graph[u].edges[i].to == v)
            return graph[u].edges[i].weight;
    }
    return -1;
}

int cmpPath(const void *a, const void *b)
{
    Path *p1 = (Path*)a;
    Path *p2 = (Path*)b;
    return p1->entryTime - p2->entryTime;
}

int trySchedule(Path *p)
{
    int arrival[MAXLEN];
    int time = p->entryTime;

    arrival[0] = time;

    for(int i=0;i<p->length-1;i++)
    {
        int u = p->nodes[i];
        int v = p->nodes[i+1];

        int w = getWeight(u,v);
        if(w < 0) return 0;

        time += w;
        arrival[i+1] = time;
    }

    for(int i=1;i<p->length;i++)
    {
        int intersection = p->nodes[i];
        int direction = p->nodes[i-1];

        int t = arrival[i];

        if(schedule[intersection][t].used &&
           schedule[intersection][t].direction != direction)
        {
            return 0;
        }
    }

    for(int i=1;i<p->length;i++)
    {
        int intersection = p->nodes[i];
        int direction = p->nodes[i-1];
        int t = arrival[i];

        schedule[intersection][t].used = 1;
        schedule[intersection][t].direction = direction;
        schedule[intersection][t].time = t;
    }

    return 1;
}

int main()
{
    printf("Enter number of intersections and edges:\n");
    int E;
    scanf("%d %d",&V,&E);

    for(int i=0;i<V;i++)
        graph[i].edgeCount = 0;

    printf("Enter edges (u v travel_time):\n");

    for(int i=0;i<E;i++)
    {
        int u,v,w;
        scanf("%d %d %d",&u,&v,&w);
        addEdge(u,v,w);
    }

    printf("Enter number of paths:\n");
    scanf("%d",&K);

    for(int i=0;i<K;i++)
    {
        printf("Path %d length:\n",i+1);
        scanf("%d",&paths[i].length);

        printf("Entry time:\n");
        scanf("%d",&paths[i].entryTime);

        printf("Nodes:\n");
        for(int j=0;j<paths[i].length;j++)
            scanf("%d",&paths[i].nodes[j]);
    }

    memset(schedule,0,sizeof(schedule));

    qsort(paths,K,sizeof(Path),cmpPath);

    int success = 0;

    for(int i=0;i<K;i++)
    {
        if(trySchedule(&paths[i]))
            success++;
    }

    printf("\n---- Signal Schedule ----\n");

    for(int v=0;v<V;v++)
    {
        printf("Intersection %d:\n",v);

        for(int t=0;t<MAXTIME;t++)
        {
            if(schedule[v][t].used)
            {
                printf("Time %d -> direction from %d\n",
                       t,
                       schedule[v][t].direction);
            }
        }
    }

    double percentage = ((double)success/K)*100.0;

    printf("\nSuccessful platoons: %d\n",success);
    printf("Total platoons: %d\n",K);
    printf("Success rate: %.2f%%\n",percentage);

    return 0;
